package com.attendance.tracker.data.api

import com.attendance.tracker.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    
    // Auth
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>
    
    @POST("api/auth/google")
    suspend fun googleLogin(@Body data: Map<String, String>): Response<LoginResponse>
    
    // Employees
    @GET("api/employees")
    suspend fun getEmployees(): Response<List<Employee>>
    
    @POST("api/employees")
    suspend fun addEmployee(@Body employee: Employee): Response<Employee>
    
    @PUT("api/employees/{id}")
    suspend fun updateEmployee(@Path("id") id: String, @Body employee: Employee): Response<Employee>
    
    @DELETE("api/employees/{id}")
    suspend fun deleteEmployee(@Path("id") id: String): Response<Unit>
    
    // Attendance
    @GET("api/attendance")
    suspend fun getAttendance(): Response<List<AttendanceRecord>>
    
    @POST("api/attendance/checkin")
    suspend fun checkIn(@Body data: Map<String, Any>): Response<AttendanceRecord>
    
    @PUT("api/attendance/update")
    suspend fun checkOut(@Body data: Map<String, Any>): Response<AttendanceRecord>
    
    @POST("api/attendance/status")
    suspend fun getAttendanceStatus(@Body data: Map<String, String>): Response<Map<String, Any>>
    
    // Leaves
    @GET("api/leaves")
    suspend fun getLeaves(): Response<List<LeaveRecord>>
    
    @POST("api/leaves")
    suspend fun applyLeave(@Body leave: Map<String, String>): Response<LeaveRecord>
    
    @PUT("api/leaves/status")
    suspend fun updateLeaveStatus(@Body data: Map<String, String>): Response<LeaveRecord>
    
    // Night Duty
    @GET("api/night-duty")
    suspend fun getNightDutyRequests(): Response<List<NightDutyRequest>>
    
    @POST("api/night-duty")
    suspend fun requestNightDuty(@Body data: Map<String, String>): Response<NightDutyRequest>
    
    @PUT("api/night-duty/status")
    suspend fun updateNightDutyStatus(@Body data: Map<String, String>): Response<NightDutyRequest>
    
    // Notifications
    @GET("api/notifications")
    suspend fun getNotifications(@Query("userId") userId: String): Response<List<Notification>>
    
    @PUT("api/notifications/{id}")
    suspend fun markNotificationRead(@Path("id") id: String): Response<Unit>
    
    @PUT("api/notifications/mark-all-read")
    suspend fun markAllNotificationsRead(@Body data: Map<String, String>): Response<Unit>
}
