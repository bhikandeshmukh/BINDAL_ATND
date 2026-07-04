package com.attendance.tracker.data.repository

import com.attendance.tracker.data.firebase.FirebaseRepository
import com.attendance.tracker.data.model.Employee
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class EmployeeRepository @Inject constructor(
    private val firebaseRepository: FirebaseRepository
) {
    suspend fun getEmployees(): Result<List<Employee>> {
        return firebaseRepository.getEmployees()
    }
    
    suspend fun addEmployee(employee: Employee): Result<Employee> {
        return firebaseRepository.addEmployee(employee)
    }
    
    suspend fun updateEmployee(employee: Employee): Result<Employee> {
        // TODO: Implement update in FirebaseRepository
        return Result.failure(Exception("Not implemented"))
    }
    
    suspend fun deleteEmployee(id: String): Result<Unit> {
        // TODO: Implement delete in FirebaseRepository
        return Result.failure(Exception("Not implemented"))
    }
}
