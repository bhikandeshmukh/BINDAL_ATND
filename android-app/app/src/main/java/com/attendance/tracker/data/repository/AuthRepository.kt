package com.attendance.tracker.data.repository

import android.content.Context
import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.attendance.tracker.data.api.ApiService
import com.attendance.tracker.data.firebase.FirebaseConfig
import com.attendance.tracker.data.model.User
import com.attendance.tracker.data.model.UserRole
import com.google.firebase.firestore.FirebaseFirestore
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.tasks.await
import org.mindrot.jbcrypt.BCrypt
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth")

@Singleton
class AuthRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val apiService: ApiService
) {
    private val gson = Gson()
    private val firestore = FirebaseFirestore.getInstance()
    
    companion object {
        private const val TAG = "AuthRepository"
        private val USER_KEY = stringPreferencesKey("user")
        private val TOKEN_KEY = stringPreferencesKey("token")
    }
    
    val currentUser: Flow<User?> = context.dataStore.data.map { preferences ->
        preferences[USER_KEY]?.let { json ->
            try {
                gson.fromJson(json, User::class.java)
            } catch (e: Exception) {
                null
            }
        }
    }
    
    suspend fun login(username: String, password: String): Result<User> {
        return try {
            Log.d(TAG, "Attempting login for username: $username")
            
            // Try numbered field format first (11_username)
            var employeeDoc = findUserByField(FirebaseConfig.EmployeeFields.USERNAME, username)
            
            // If not found, try by name field (02_name)
            if (employeeDoc == null) {
                Log.d(TAG, "User not found by '11_username', trying '02_name' field")
                employeeDoc = findUserByField(FirebaseConfig.EmployeeFields.NAME, username)
            }
            
            // If still not found, try case-insensitive search
            if (employeeDoc == null) {
                Log.d(TAG, "Trying case-insensitive search")
                employeeDoc = findUserCaseInsensitive(username)
            }
            
            if (employeeDoc == null) {
                Log.e(TAG, "User not found in database")
                return Result.failure(Exception("User not found. Please check your username."))
            }
            
            Log.d(TAG, "User found: ${employeeDoc.id}")
            
            // Get password from numbered field (12_password)
            val storedPassword = employeeDoc.getString(FirebaseConfig.EmployeeFields.PASSWORD) ?: ""
            
            // Password verification
            if (!verifyPassword(password, storedPassword)) {
                Log.e(TAG, "Password verification failed")
                return Result.failure(Exception("Invalid password"))
            }
            
            // Extract user data from numbered fields
            val rawUsername = employeeDoc.getString(FirebaseConfig.EmployeeFields.USERNAME) 
                ?: employeeDoc.getString(FirebaseConfig.EmployeeFields.NAME) ?: username
            val rawName = employeeDoc.getString(FirebaseConfig.EmployeeFields.NAME) 
                ?: employeeDoc.getString(FirebaseConfig.EmployeeFields.USERNAME) ?: ""
            val rawEmail = employeeDoc.getString(FirebaseConfig.EmployeeFields.EMAIL) ?: ""

            val user = User(
                id = (employeeDoc.getString(FirebaseConfig.EmployeeFields.ID) ?: employeeDoc.id).trim(),
                username = rawUsername.trim(),
                name = rawName.trim(),
                role = parseUserRole(employeeDoc.getString(FirebaseConfig.EmployeeFields.ROLE)),
                email = rawEmail.trim()
            )
            
            Log.d(TAG, "Login successful for: ${user.name}, role: ${user.role}")
            saveUser(user, "firebase_token_${user.id}")
            Result.success(user)
        } catch (e: Exception) {
            Log.e(TAG, "Login error: ${e.message}", e)
            Result.failure(Exception("Login failed: ${e.message}"))
        }
    }

    suspend fun register(
        username: String,
        password: String,
        name: String,
        email: String,
        salary: Double,
        inTime: String = "10:00:00 AM",
        outTime: String = "07:00:00 PM"
    ): Result<User> {
        return try {
            Log.d(TAG, "Attempting registration for username: $username")
            
            val existingUsername = findUserByField(FirebaseConfig.EmployeeFields.USERNAME, username)
            if (existingUsername != null) {
                return Result.failure(Exception("Username already exists"))
            }
            
            val existingEmail = findUserByField(FirebaseConfig.EmployeeFields.EMAIL, email)
            if (existingEmail != null) {
                return Result.failure(Exception("Email already exists"))
            }

            val snapshot = firestore.collection(FirebaseConfig.EMPLOYEES_COLLECTION).get().await()
            val existingIds = snapshot.documents.mapNotNull { doc ->
                doc.getString(FirebaseConfig.EmployeeFields.ID)?.toIntOrNull()
            }
            val nextId = if (existingIds.isNotEmpty()) existingIds.max() + 1 else 1
            val id = String.format("%03d", nextId)

            val safeId = name.lowercase()
                .replace(Regex("\\s+"), "-")
                .replace(Regex("[^a-z0-9-]"), "")

            val hashedPassword = BCrypt.hashpw(password, BCrypt.gensalt(10))

            val newUserData = hashMapOf(
                FirebaseConfig.EmployeeFields.ID to id,
                FirebaseConfig.EmployeeFields.NAME to name,
                FirebaseConfig.EmployeeFields.POSITION to "Employee",
                FirebaseConfig.EmployeeFields.ROLE to "user",
                FirebaseConfig.EmployeeFields.STATUS to "active",
                FirebaseConfig.EmployeeFields.TOTAL_WORKING_DAYS to 26,
                FirebaseConfig.EmployeeFields.FIXED_IN_TIME to inTime,
                FirebaseConfig.EmployeeFields.FIXED_OUT_TIME to outTime,
                FirebaseConfig.EmployeeFields.PER_MINUTE_RATE to 0.0,
                FirebaseConfig.EmployeeFields.FIXED_SALARY to salary,
                FirebaseConfig.EmployeeFields.USERNAME to username,
                FirebaseConfig.EmployeeFields.PASSWORD to hashedPassword,
                FirebaseConfig.EmployeeFields.EMAIL to email,
                FirebaseConfig.EmployeeFields.CREATED_AT to com.google.firebase.Timestamp.now()
            )

            firestore.collection(FirebaseConfig.EMPLOYEES_COLLECTION)
                .document(safeId)
                .set(newUserData)
                .await()

            val user = User(
                id = id.trim(),
                username = username.trim(),
                name = name.trim(),
                role = UserRole.USER,
                email = email.trim()
            )

            saveUser(user, "firebase_token_${user.id}")
            Result.success(user)
        } catch (e: Exception) {
            Log.e(TAG, "Registration error: ${e.message}", e)
            Result.failure(Exception("Registration failed: ${e.message}"))
        }
    }
    
    private suspend fun findUserByField(fieldName: String, value: String): com.google.firebase.firestore.DocumentSnapshot? {
        return try {
            val snapshot = firestore.collection(FirebaseConfig.EMPLOYEES_COLLECTION)
                .whereEqualTo(fieldName, value)
                .get()
                .await()
            snapshot.documents.firstOrNull()
        } catch (e: Exception) {
            Log.e(TAG, "Error finding user by $fieldName: ${e.message}")
            null
        }
    }
    
    private suspend fun findUserCaseInsensitive(username: String): com.google.firebase.firestore.DocumentSnapshot? {
        return try {
            val snapshot = firestore.collection(FirebaseConfig.EMPLOYEES_COLLECTION)
                .get()
                .await()
            
            snapshot.documents.firstOrNull { doc ->
                val docUsername = doc.getString(FirebaseConfig.EmployeeFields.USERNAME)?.lowercase()
                val docName = doc.getString(FirebaseConfig.EmployeeFields.NAME)?.lowercase()
                val searchTerm = username.lowercase()
                docUsername == searchTerm || docName == searchTerm
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in case-insensitive search: ${e.message}")
            null
        }
    }
    
    private fun parseUserRole(roleString: String?): UserRole {
        return when (roleString?.lowercase()) {
            "admin" -> UserRole.ADMIN
            else -> UserRole.USER
        }
    }
    
    private fun verifyPassword(input: String, stored: String): Boolean {
        if (input == stored) return true

        return try {
            (stored.startsWith("\$2a\$") || stored.startsWith("\$2b\$")) && BCrypt.checkpw(input, stored)
        } catch (e: Exception) {
            false
        }
    }
    
    private suspend fun saveUser(user: User, token: String) {
        context.dataStore.edit { preferences ->
            preferences[USER_KEY] = gson.toJson(user)
            preferences[TOKEN_KEY] = token
        }
    }
    
    suspend fun logout() {
        context.dataStore.edit { preferences ->
            preferences.remove(USER_KEY)
            preferences.remove(TOKEN_KEY)
        }
    }
    
    suspend fun getToken(): String? {
        var token: String? = null
        context.dataStore.data.collect { preferences ->
            token = preferences[TOKEN_KEY]
        }
        return token
    }
    
    // Google Sign-In - save user after successful Google authentication
    suspend fun saveGoogleUser(
        googleId: String,
        email: String,
        displayName: String
    ): Result<User> {
        return try {
            // Check if user exists in database by email
            val existingUser = findUserByField(FirebaseConfig.EmployeeFields.EMAIL, email)
            
            val user = if (existingUser != null) {
                // User exists, use their data
                User(
                    id = existingUser.getString(FirebaseConfig.EmployeeFields.ID) ?: existingUser.id,
                    username = existingUser.getString(FirebaseConfig.EmployeeFields.USERNAME) ?: email,
                    name = existingUser.getString(FirebaseConfig.EmployeeFields.NAME) ?: displayName,
                    role = parseUserRole(existingUser.getString(FirebaseConfig.EmployeeFields.ROLE)),
                    email = email
                )
            } else {
                // New user - create with default role using numbered fields
                val safeId = displayName.lowercase()
                    .replace(Regex("\\s+"), "-")
                    .replace(Regex("[^a-z0-9-]"), "")
                
                val newUserData = hashMapOf(
                    FirebaseConfig.EmployeeFields.ID to "999", // Auto-generated ID
                    FirebaseConfig.EmployeeFields.NAME to displayName,
                    FirebaseConfig.EmployeeFields.POSITION to "",
                    FirebaseConfig.EmployeeFields.ROLE to "user",
                    FirebaseConfig.EmployeeFields.STATUS to "active",
                    FirebaseConfig.EmployeeFields.TOTAL_WORKING_DAYS to 26,
                    FirebaseConfig.EmployeeFields.FIXED_IN_TIME to "09:00:00 AM",
                    FirebaseConfig.EmployeeFields.FIXED_OUT_TIME to "07:00:00 PM",
                    FirebaseConfig.EmployeeFields.PER_MINUTE_RATE to 0,
                    FirebaseConfig.EmployeeFields.FIXED_SALARY to 0,
                    FirebaseConfig.EmployeeFields.USERNAME to email,
                    FirebaseConfig.EmployeeFields.PASSWORD to "",
                    FirebaseConfig.EmployeeFields.EMAIL to email,
                    FirebaseConfig.EmployeeFields.CREATED_AT to com.google.firebase.Timestamp.now()
                )
                
                firestore.collection(FirebaseConfig.EMPLOYEES_COLLECTION)
                    .document(safeId)
                    .set(newUserData)
                    .await()
                
                User(
                    id = safeId,
                    username = email,
                    name = displayName,
                    role = UserRole.USER,
                    email = email
                )
            }
            
            saveUser(user, "google_token_$googleId")
            Result.success(user)
        } catch (e: Exception) {
            Log.e(TAG, "Google sign-in save error: ${e.message}", e)
            Result.failure(e)
        }
    }
    
    suspend fun signInWithGoogle(): Result<User> {
        // This is a placeholder - actual Google Sign-In requires Activity context
        return Result.failure(Exception("Google Sign-In requires activity context"))
    }
}
