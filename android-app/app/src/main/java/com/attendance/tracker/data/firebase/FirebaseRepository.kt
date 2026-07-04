package com.attendance.tracker.data.firebase

import com.attendance.tracker.data.model.*
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FirebaseRepository @Inject constructor() {
    
    private val firestore = FirebaseFirestore.getInstance()
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    private val timeFormat = SimpleDateFormat("hh:mm:ss a", Locale.getDefault())
    
    // ==================== EMPLOYEES ====================
    
    suspend fun getEmployees(): Result<List<Employee>> {
        return try {
            val snapshot = firestore.collection(FirebaseConfig.EMPLOYEES_COLLECTION)
                .get()
                .await()
            
            val employees = snapshot.documents.mapNotNull { doc ->
                val data = doc.data ?: return@mapNotNull null
                Employee(
                    id = data[FirebaseConfig.EmployeeFields.ID] as? String ?: doc.id,
                    name = data[FirebaseConfig.EmployeeFields.NAME] as? String ?: "",
                    position = data[FirebaseConfig.EmployeeFields.POSITION] as? String,
                    role = if ((data[FirebaseConfig.EmployeeFields.ROLE] as? String) == "admin") 
                        UserRole.ADMIN else UserRole.USER,
                    status = data[FirebaseConfig.EmployeeFields.STATUS] as? String ?: "active",
                    totalWorkingDays = (data[FirebaseConfig.EmployeeFields.TOTAL_WORKING_DAYS] as? Long)?.toInt(),
                    fixedInTime = data[FirebaseConfig.EmployeeFields.FIXED_IN_TIME] as? String,
                    fixedOutTime = data[FirebaseConfig.EmployeeFields.FIXED_OUT_TIME] as? String,
                    perMinuteRate = (data[FirebaseConfig.EmployeeFields.PER_MINUTE_RATE] as? Number)?.toDouble(),
                    fixedSalary = (data[FirebaseConfig.EmployeeFields.FIXED_SALARY] as? Number)?.toDouble(),
                    username = data[FirebaseConfig.EmployeeFields.USERNAME] as? String,
                    email = data[FirebaseConfig.EmployeeFields.EMAIL] as? String
                )
            }.sortedBy { it.id.toIntOrNull() ?: 0 }
            
            Result.success(employees)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getEmployeeByUsername(username: String): Employee? {
        return try {
            val snapshot = firestore.collection(FirebaseConfig.EMPLOYEES_COLLECTION)
                .whereEqualTo(FirebaseConfig.EmployeeFields.USERNAME, username)
                .get()
                .await()
            
            val doc = snapshot.documents.firstOrNull() ?: return null
            val data = doc.data ?: return null
            
            Employee(
                id = data[FirebaseConfig.EmployeeFields.ID] as? String ?: doc.id,
                name = data[FirebaseConfig.EmployeeFields.NAME] as? String ?: "",
                position = data[FirebaseConfig.EmployeeFields.POSITION] as? String,
                role = if ((data[FirebaseConfig.EmployeeFields.ROLE] as? String) == "admin") 
                    UserRole.ADMIN else UserRole.USER,
                status = data[FirebaseConfig.EmployeeFields.STATUS] as? String ?: "active",
                totalWorkingDays = (data[FirebaseConfig.EmployeeFields.TOTAL_WORKING_DAYS] as? Long)?.toInt(),
                fixedInTime = data[FirebaseConfig.EmployeeFields.FIXED_IN_TIME] as? String,
                fixedOutTime = data[FirebaseConfig.EmployeeFields.FIXED_OUT_TIME] as? String,
                perMinuteRate = (data[FirebaseConfig.EmployeeFields.PER_MINUTE_RATE] as? Number)?.toDouble(),
                fixedSalary = (data[FirebaseConfig.EmployeeFields.FIXED_SALARY] as? Number)?.toDouble(),
                username = data[FirebaseConfig.EmployeeFields.USERNAME] as? String,
                email = data[FirebaseConfig.EmployeeFields.EMAIL] as? String
            )
        } catch (e: Exception) {
            null
        }
    }
    
    suspend fun addEmployee(employee: Employee): Result<Employee> {
        return try {
            val safeId = employee.name.lowercase()
                .replace(Regex("\\s+"), "-")
                .replace(Regex("[^a-z0-9-]"), "")
            
            val data = hashMapOf(
                FirebaseConfig.EmployeeFields.ID to employee.id,
                FirebaseConfig.EmployeeFields.NAME to employee.name,
                FirebaseConfig.EmployeeFields.POSITION to (employee.position ?: ""),
                FirebaseConfig.EmployeeFields.ROLE to if (employee.role == UserRole.ADMIN) "admin" else "user",
                FirebaseConfig.EmployeeFields.STATUS to employee.status,
                FirebaseConfig.EmployeeFields.TOTAL_WORKING_DAYS to (employee.totalWorkingDays ?: 26),
                FirebaseConfig.EmployeeFields.FIXED_IN_TIME to (employee.fixedInTime ?: "09:00:00 AM"),
                FirebaseConfig.EmployeeFields.FIXED_OUT_TIME to (employee.fixedOutTime ?: "07:00:00 PM"),
                FirebaseConfig.EmployeeFields.PER_MINUTE_RATE to (employee.perMinuteRate ?: 0.0),
                FirebaseConfig.EmployeeFields.FIXED_SALARY to (employee.fixedSalary ?: 0.0),
                FirebaseConfig.EmployeeFields.USERNAME to (employee.username ?: ""),
                FirebaseConfig.EmployeeFields.EMAIL to (employee.email ?: "${safeId}@company.com"),
                FirebaseConfig.EmployeeFields.CREATED_AT to Timestamp.now()
            )
            
            firestore.collection(FirebaseConfig.EMPLOYEES_COLLECTION)
                .document(safeId)
                .set(data)
                .await()
            
            Result.success(employee.copy(id = safeId))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }


    // ==================== ATTENDANCE (Employee-wise subcollection) ====================
    
    suspend fun getAttendance(): Result<List<AttendanceRecord>> {
        return try {
            val records = mutableListOf<AttendanceRecord>()
            
            // Get all employees from attendance collection
            val employeesSnapshot = firestore.collection(FirebaseConfig.ATTENDANCE_COLLECTION)
                .get()
                .await()
            
            // For each employee, get their attendance records
            for (employeeDoc in employeesSnapshot.documents) {
                val employeeName = employeeDoc.id
                val recordsSnapshot = firestore.collection(FirebaseConfig.ATTENDANCE_COLLECTION)
                    .document(employeeName)
                    .collection(FirebaseConfig.RECORDS_SUBCOLLECTION)
                    .get()
                    .await()
                
                for (recordDoc in recordsSnapshot.documents) {
                    val data = recordDoc.data ?: continue
                    records.add(
                        AttendanceRecord(
                            id = recordDoc.id,
                            employeeName = employeeName,
                            date = data[FirebaseConfig.AttendanceFields.DATE] as? String ?: "",
                            inTime = data[FirebaseConfig.AttendanceFields.IN_TIME] as? String ?: "",
                            outTime = data[FirebaseConfig.AttendanceFields.OUT_TIME] as? String ?: "",
                            inLocation = data[FirebaseConfig.AttendanceFields.IN_LOCATION] as? String ?: "",
                            outLocation = data[FirebaseConfig.AttendanceFields.OUT_LOCATION] as? String ?: "",
                            totalMinutes = (data[FirebaseConfig.AttendanceFields.TOTAL_MINUTES] as? Long)?.toInt() ?: 0,
                            totalHours = data[FirebaseConfig.AttendanceFields.TOTAL_HOURS] as? String ?: "",
                            isNightDuty = false
                        )
                    )
                }
            }
            
            Result.success(records.sortedByDescending { it.date })
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getAttendanceByEmployee(employeeName: String, date: String): AttendanceRecord? {
        return try {
            val recordDoc = firestore.collection(FirebaseConfig.ATTENDANCE_COLLECTION)
                .document(employeeName)
                .collection(FirebaseConfig.RECORDS_SUBCOLLECTION)
                .document(date)
                .get()
                .await()
            
            if (!recordDoc.exists()) return null
            
            val data = recordDoc.data ?: return null
            AttendanceRecord(
                id = recordDoc.id,
                employeeName = employeeName,
                date = data[FirebaseConfig.AttendanceFields.DATE] as? String ?: "",
                inTime = data[FirebaseConfig.AttendanceFields.IN_TIME] as? String ?: "",
                outTime = data[FirebaseConfig.AttendanceFields.OUT_TIME] as? String ?: "",
                inLocation = data[FirebaseConfig.AttendanceFields.IN_LOCATION] as? String ?: "",
                outLocation = data[FirebaseConfig.AttendanceFields.OUT_LOCATION] as? String ?: "",
                totalMinutes = (data[FirebaseConfig.AttendanceFields.TOTAL_MINUTES] as? Long)?.toInt() ?: 0,
                totalHours = data[FirebaseConfig.AttendanceFields.TOTAL_HOURS] as? String ?: "",
                isNightDuty = false
            )
        } catch (e: Exception) {
            null
        }
    }
    
    suspend fun getAttendanceByEmployeeName(employeeName: String): Result<List<AttendanceRecord>> {
        return try {
            val records = mutableListOf<AttendanceRecord>()
            
            val recordsSnapshot = firestore.collection(FirebaseConfig.ATTENDANCE_COLLECTION)
                .document(employeeName)
                .collection(FirebaseConfig.RECORDS_SUBCOLLECTION)
                .get()
                .await()
            
            for (recordDoc in recordsSnapshot.documents) {
                val data = recordDoc.data ?: continue
                records.add(
                    AttendanceRecord(
                        id = recordDoc.id,
                        employeeName = employeeName,
                        date = data[FirebaseConfig.AttendanceFields.DATE] as? String ?: "",
                        inTime = data[FirebaseConfig.AttendanceFields.IN_TIME] as? String ?: "",
                        outTime = data[FirebaseConfig.AttendanceFields.OUT_TIME] as? String ?: "",
                        inLocation = data[FirebaseConfig.AttendanceFields.IN_LOCATION] as? String ?: "",
                        outLocation = data[FirebaseConfig.AttendanceFields.OUT_LOCATION] as? String ?: "",
                        totalMinutes = (data[FirebaseConfig.AttendanceFields.TOTAL_MINUTES] as? Long)?.toInt() ?: 0,
                        totalHours = data[FirebaseConfig.AttendanceFields.TOTAL_HOURS] as? String ?: "",
                        isNightDuty = false
                    )
                )
            }
            
            Result.success(records.sortedByDescending { it.date })
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun checkIn(
        employeeName: String,
        date: String,
        inTime: String,
        inLocation: String,
        isNightDuty: Boolean = false
    ): Result<AttendanceRecord> {
        return try {
            // Create/update employee document
            firestore.collection(FirebaseConfig.ATTENDANCE_COLLECTION)
                .document(employeeName)
                .set(hashMapOf(
                    "employeeName" to employeeName,
                    "lastUpdated" to Timestamp.now()
                ), com.google.firebase.firestore.SetOptions.merge())
                .await()
            
            // Add attendance record as subcollection
            val data = hashMapOf(
                FirebaseConfig.AttendanceFields.DATE to date,
                FirebaseConfig.AttendanceFields.IN_TIME to inTime,
                FirebaseConfig.AttendanceFields.OUT_TIME to "",
                FirebaseConfig.AttendanceFields.IN_LOCATION to inLocation,
                FirebaseConfig.AttendanceFields.OUT_LOCATION to "",
                FirebaseConfig.AttendanceFields.TOTAL_MINUTES to 0,
                FirebaseConfig.AttendanceFields.TOTAL_HOURS to "",
                FirebaseConfig.AttendanceFields.MODIFIED_BY to "",
                FirebaseConfig.AttendanceFields.OVERTIME_MINUTES to 0,
                FirebaseConfig.AttendanceFields.OVERTIME_PAY to 0,
                FirebaseConfig.AttendanceFields.IS_HOLIDAY to "",
                FirebaseConfig.AttendanceFields.CREATED_AT to Timestamp.now()
            )
            
            firestore.collection(FirebaseConfig.ATTENDANCE_COLLECTION)
                .document(employeeName)
                .collection(FirebaseConfig.RECORDS_SUBCOLLECTION)
                .document(date)
                .set(data)
                .await()
            
            val record = AttendanceRecord(
                id = date,
                employeeName = employeeName,
                date = date,
                inTime = inTime,
                inLocation = inLocation
            )
            Result.success(record)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun checkOut(
        employeeName: String,
        date: String,
        outTime: String,
        outLocation: String
    ): Result<AttendanceRecord> {
        return try {
            val recordRef = firestore.collection(FirebaseConfig.ATTENDANCE_COLLECTION)
                .document(employeeName)
                .collection(FirebaseConfig.RECORDS_SUBCOLLECTION)
                .document(date)
            
            val recordSnap = recordRef.get().await()
            if (!recordSnap.exists()) {
                return Result.failure(Exception("No check-in found"))
            }
            
            val data = recordSnap.data ?: return Result.failure(Exception("No data found"))
            val inTime = data[FirebaseConfig.AttendanceFields.IN_TIME] as? String ?: ""
            
            // Calculate total minutes
            val totalMinutes = calculateMinutes(inTime, outTime)
            val totalHours = formatHours(totalMinutes)
            
            recordRef.update(
                mapOf(
                    FirebaseConfig.AttendanceFields.OUT_TIME to outTime,
                    FirebaseConfig.AttendanceFields.OUT_LOCATION to outLocation,
                    FirebaseConfig.AttendanceFields.TOTAL_MINUTES to totalMinutes,
                    FirebaseConfig.AttendanceFields.TOTAL_HOURS to totalHours
                )
            ).await()
            
            val record = AttendanceRecord(
                id = date,
                employeeName = employeeName,
                date = date,
                inTime = inTime,
                outTime = outTime,
                inLocation = data[FirebaseConfig.AttendanceFields.IN_LOCATION] as? String ?: "",
                outLocation = outLocation,
                totalMinutes = totalMinutes,
                totalHours = totalHours
            )
            Result.success(record)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }


    // ==================== LEAVES (Employee-wise subcollection) ====================
    
    suspend fun getLeaves(): Result<List<LeaveRecord>> {
        return try {
            val requests = mutableListOf<LeaveRecord>()
            
            // Get all employees from leaveRequests collection
            val employeesSnapshot = firestore.collection(FirebaseConfig.LEAVES_COLLECTION)
                .get()
                .await()
            
            // For each employee, get their leave requests
            for (employeeDoc in employeesSnapshot.documents) {
                val employeeName = employeeDoc.id
                val requestsSnapshot = firestore.collection(FirebaseConfig.LEAVES_COLLECTION)
                    .document(employeeName)
                    .collection(FirebaseConfig.REQUESTS_SUBCOLLECTION)
                    .get()
                    .await()
                
                for (requestDoc in requestsSnapshot.documents) {
                    val data = requestDoc.data ?: continue
                    val statusStr = (data[FirebaseConfig.LeaveFields.STATUS] as? String)?.lowercase() ?: "pending"
                    val status = when (statusStr) {
                        "approved" -> LeaveStatus.APPROVED
                        "rejected" -> LeaveStatus.REJECTED
                        else -> LeaveStatus.PENDING
                    }
                    
                    requests.add(
                        LeaveRecord(
                            id = requestDoc.id,
                            employeeName = employeeName,
                            leaveType = data[FirebaseConfig.LeaveFields.LEAVE_TYPE] as? String ?: "",
                            startDate = data[FirebaseConfig.LeaveFields.START_DATE] as? String ?: "",
                            endDate = data[FirebaseConfig.LeaveFields.END_DATE] as? String ?: "",
                            reason = data[FirebaseConfig.LeaveFields.REASON] as? String ?: "",
                            status = status,
                            appliedDate = data[FirebaseConfig.LeaveFields.APPLIED_DATE] as? String ?: "",
                            paymentStatus = data[FirebaseConfig.LeaveFields.PAYMENT_STATUS] as? String,
                            approvedBy = data[FirebaseConfig.LeaveFields.APPROVED_BY] as? String,
                            approvedDate = data[FirebaseConfig.LeaveFields.APPROVED_DATE] as? String,
                            approvedTime = data[FirebaseConfig.LeaveFields.APPROVED_TIME] as? String
                        )
                    )
                }
            }
            
            Result.success(requests.sortedByDescending { it.appliedDate })
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun applyLeave(
        employeeName: String,
        leaveType: String,
        startDate: String,
        endDate: String,
        reason: String
    ): Result<LeaveRecord> {
        return try {
            // Create/update employee document
            firestore.collection(FirebaseConfig.LEAVES_COLLECTION)
                .document(employeeName)
                .set(hashMapOf(
                    "employeeName" to employeeName,
                    "lastUpdated" to Timestamp.now()
                ), com.google.firebase.firestore.SetOptions.merge())
                .await()
            
            val appliedDate = dateFormat.format(Date())
            
            val data = hashMapOf(
                FirebaseConfig.LeaveFields.LEAVE_TYPE to leaveType,
                FirebaseConfig.LeaveFields.START_DATE to startDate,
                FirebaseConfig.LeaveFields.END_DATE to endDate,
                FirebaseConfig.LeaveFields.REASON to reason,
                FirebaseConfig.LeaveFields.STATUS to "pending",
                FirebaseConfig.LeaveFields.PAYMENT_STATUS to "",
                FirebaseConfig.LeaveFields.APPLIED_DATE to appliedDate,
                FirebaseConfig.LeaveFields.APPROVED_BY to "",
                FirebaseConfig.LeaveFields.APPROVED_DATE to "",
                FirebaseConfig.LeaveFields.APPROVED_TIME to "",
                FirebaseConfig.LeaveFields.CREATED_AT to Timestamp.now()
            )
            
            val docRef = firestore.collection(FirebaseConfig.LEAVES_COLLECTION)
                .document(employeeName)
                .collection(FirebaseConfig.REQUESTS_SUBCOLLECTION)
                .add(data)
                .await()
            
            val leave = LeaveRecord(
                id = docRef.id,
                employeeName = employeeName,
                leaveType = leaveType,
                startDate = startDate,
                endDate = endDate,
                reason = reason,
                status = LeaveStatus.PENDING,
                appliedDate = appliedDate
            )
            Result.success(leave)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun updateLeaveStatus(
        id: String,
        status: String,
        approvedBy: String? = null
    ): Result<LeaveRecord> {
        return try {
            // Find the leave request across all employees
            val employeesSnapshot = firestore.collection(FirebaseConfig.LEAVES_COLLECTION)
                .get()
                .await()
            
            for (employeeDoc in employeesSnapshot.documents) {
                val employeeName = employeeDoc.id
                val requestRef = firestore.collection(FirebaseConfig.LEAVES_COLLECTION)
                    .document(employeeName)
                    .collection(FirebaseConfig.REQUESTS_SUBCOLLECTION)
                    .document(id)
                
                val requestSnap = requestRef.get().await()
                
                if (requestSnap.exists()) {
                    val now = Date()
                    val updates = hashMapOf<String, Any>(
                        FirebaseConfig.LeaveFields.STATUS to status,
                        FirebaseConfig.LeaveFields.APPROVED_BY to (approvedBy ?: ""),
                        FirebaseConfig.LeaveFields.APPROVED_DATE to dateFormat.format(now),
                        FirebaseConfig.LeaveFields.APPROVED_TIME to timeFormat.format(now).uppercase()
                    )
                    
                    requestRef.update(updates).await()
                    
                    val data = requestSnap.data ?: throw Exception("No data found")
                    val leaveStatus = when (status.lowercase()) {
                        "approved" -> LeaveStatus.APPROVED
                        "rejected" -> LeaveStatus.REJECTED
                        else -> LeaveStatus.PENDING
                    }
                    
                    return Result.success(
                        LeaveRecord(
                            id = id,
                            employeeName = employeeName,
                            leaveType = data[FirebaseConfig.LeaveFields.LEAVE_TYPE] as? String ?: "",
                            startDate = data[FirebaseConfig.LeaveFields.START_DATE] as? String ?: "",
                            endDate = data[FirebaseConfig.LeaveFields.END_DATE] as? String ?: "",
                            reason = data[FirebaseConfig.LeaveFields.REASON] as? String ?: "",
                            status = leaveStatus,
                            appliedDate = data[FirebaseConfig.LeaveFields.APPLIED_DATE] as? String ?: "",
                            approvedBy = approvedBy,
                            approvedDate = dateFormat.format(now),
                            approvedTime = timeFormat.format(now).uppercase()
                        )
                    )
                }
            }
            
            Result.failure(Exception("Leave request not found"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }


    // ==================== NIGHT DUTY (Employee-wise subcollection) ====================
    
    suspend fun getNightDutyRequests(): Result<List<NightDutyRequest>> {
        return try {
            val requests = mutableListOf<NightDutyRequest>()
            
            // Get all employees from nightDuty collection
            val employeesSnapshot = firestore.collection(FirebaseConfig.NIGHT_DUTY_COLLECTION)
                .get()
                .await()
            
            // For each employee, get their night duty requests
            for (employeeDoc in employeesSnapshot.documents) {
                val employeeName = employeeDoc.id
                val requestsSnapshot = firestore.collection(FirebaseConfig.NIGHT_DUTY_COLLECTION)
                    .document(employeeName)
                    .collection(FirebaseConfig.REQUESTS_SUBCOLLECTION)
                    .get()
                    .await()
                
                for (requestDoc in requestsSnapshot.documents) {
                    val data = requestDoc.data ?: continue
                    requests.add(
                        NightDutyRequest(
                            id = requestDoc.id,
                            employeeName = employeeName,
                            date = data[FirebaseConfig.NightDutyFields.DATE] as? String ?: "",
                            reason = data[FirebaseConfig.NightDutyFields.REASON] as? String ?: "",
                            status = data[FirebaseConfig.NightDutyFields.STATUS] as? String ?: "Pending",
                            requestedAt = data[FirebaseConfig.NightDutyFields.APPLIED_DATE] as? String ?: "",
                            approvedBy = data[FirebaseConfig.NightDutyFields.APPROVED_BY] as? String
                        )
                    )
                }
            }
            
            Result.success(requests.sortedByDescending { it.requestedAt })
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun requestNightDuty(
        employeeName: String,
        date: String,
        reason: String
    ): Result<NightDutyRequest> {
        return try {
            // Create/update employee document
            firestore.collection(FirebaseConfig.NIGHT_DUTY_COLLECTION)
                .document(employeeName)
                .set(hashMapOf(
                    "employeeName" to employeeName,
                    "lastUpdated" to Timestamp.now()
                ), com.google.firebase.firestore.SetOptions.merge())
                .await()
            
            val now = Date()
            val appliedDate = dateFormat.format(now)
            val requestedTime = timeFormat.format(now).uppercase()
            
            val data = hashMapOf(
                FirebaseConfig.NightDutyFields.DATE to date,
                FirebaseConfig.NightDutyFields.START_TIME to "08:00:00 PM",
                FirebaseConfig.NightDutyFields.END_TIME to "08:00:00 AM",
                FirebaseConfig.NightDutyFields.REASON to reason,
                FirebaseConfig.NightDutyFields.STATUS to "Pending",
                FirebaseConfig.NightDutyFields.APPLIED_DATE to appliedDate,
                FirebaseConfig.NightDutyFields.REQUESTED_TIME to requestedTime,
                FirebaseConfig.NightDutyFields.REQUESTED_BY to employeeName,
                FirebaseConfig.NightDutyFields.APPROVED_BY to "",
                FirebaseConfig.NightDutyFields.APPROVED_DATE to "",
                FirebaseConfig.NightDutyFields.APPROVED_TIME to "",
                FirebaseConfig.NightDutyFields.CREATED_AT to Timestamp.now()
            )
            
            val docRef = firestore.collection(FirebaseConfig.NIGHT_DUTY_COLLECTION)
                .document(employeeName)
                .collection(FirebaseConfig.REQUESTS_SUBCOLLECTION)
                .add(data)
                .await()
            
            val request = NightDutyRequest(
                id = docRef.id,
                employeeName = employeeName,
                date = date,
                reason = reason,
                status = "Pending",
                requestedAt = appliedDate
            )
            Result.success(request)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun updateNightDutyStatus(
        id: String,
        status: String,
        approvedBy: String? = null
    ): Result<NightDutyRequest> {
        return try {
            // Normalize status to capitalize first letter
            val normalizedStatus = status.replaceFirstChar { it.uppercase() }
            
            // Find the night duty request across all employees
            val employeesSnapshot = firestore.collection(FirebaseConfig.NIGHT_DUTY_COLLECTION)
                .get()
                .await()
            
            for (employeeDoc in employeesSnapshot.documents) {
                val employeeName = employeeDoc.id
                val requestRef = firestore.collection(FirebaseConfig.NIGHT_DUTY_COLLECTION)
                    .document(employeeName)
                    .collection(FirebaseConfig.REQUESTS_SUBCOLLECTION)
                    .document(id)
                
                val requestSnap = requestRef.get().await()
                
                if (requestSnap.exists()) {
                    val now = Date()
                    val updates = hashMapOf<String, Any>(
                        FirebaseConfig.NightDutyFields.STATUS to normalizedStatus,
                        FirebaseConfig.NightDutyFields.APPROVED_BY to (approvedBy ?: ""),
                        FirebaseConfig.NightDutyFields.APPROVED_DATE to dateFormat.format(now),
                        FirebaseConfig.NightDutyFields.APPROVED_TIME to timeFormat.format(now).uppercase()
                    )
                    
                    requestRef.update(updates).await()
                    
                    val data = requestSnap.data ?: throw Exception("No data found")
                    
                    return Result.success(
                        NightDutyRequest(
                            id = id,
                            employeeName = employeeName,
                            date = data[FirebaseConfig.NightDutyFields.DATE] as? String ?: "",
                            reason = data[FirebaseConfig.NightDutyFields.REASON] as? String ?: "",
                            status = normalizedStatus,
                            requestedAt = data[FirebaseConfig.NightDutyFields.APPLIED_DATE] as? String ?: "",
                            approvedBy = approvedBy
                        )
                    )
                }
            }
            
            Result.failure(Exception("Night duty request not found"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }


    // ==================== NOTIFICATIONS ====================
    
    suspend fun getNotifications(userId: String): Result<List<Notification>> {
        return try {
            val snapshot = firestore.collection(FirebaseConfig.NOTIFICATIONS_COLLECTION)
                .whereEqualTo("userId", userId)
                .get()
                .await()
            
            val notifications = snapshot.documents.mapNotNull { doc ->
                val data = doc.data ?: return@mapNotNull null
                Notification(
                    id = doc.id,
                    userId = data["userId"] as? String ?: "",
                    type = data["type"] as? String ?: "",
                    title = data["title"] as? String ?: "",
                    message = data["message"] as? String ?: "",
                    read = data["read"] as? Boolean ?: false,
                    createdAt = (data["createdAt"] as? Timestamp)?.toDate()?.toString() ?: ""
                )
            }.sortedByDescending { it.createdAt }
            
            Result.success(notifications)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun markNotificationRead(id: String): Result<Unit> {
        return try {
            firestore.collection(FirebaseConfig.NOTIFICATIONS_COLLECTION)
                .document(id)
                .update("read", true)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // ==================== HELPER FUNCTIONS ====================
    
    private fun calculateMinutes(inTime: String, outTime: String): Int {
        return try {
            val parseTime = { timeStr: String ->
                val parts = timeStr.split(" ")
                val timeParts = parts[0].split(":")
                var hours = timeParts[0].toInt()
                val minutes = timeParts[1].toInt()
                val period = parts.getOrNull(1)?.uppercase() ?: "AM"
                
                if (period == "PM" && hours != 12) hours += 12
                if (period == "AM" && hours == 12) hours = 0
                
                hours * 60 + minutes
            }
            
            val inMinutes = parseTime(inTime)
            val outMinutes = parseTime(outTime)
            
            var totalMins = outMinutes - inMinutes
            if (totalMins < 0) totalMins += 24 * 60
            
            totalMins
        } catch (e: Exception) {
            0
        }
    }
    
    private fun formatHours(minutes: Int): String {
        val hours = minutes / 60
        val mins = minutes % 60
        return "${hours}h ${mins}m"
    }
}
