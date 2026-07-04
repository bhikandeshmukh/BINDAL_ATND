package com.attendance.tracker.ui.screens.employees

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.tracker.data.model.Employee
import com.attendance.tracker.data.model.UserRole
import com.attendance.tracker.data.repository.EmployeeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

data class EmployeeUiState(
    val isLoading: Boolean = false,
    val employees: List<Employee> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class EmployeeViewModel @Inject constructor(
    private val employeeRepository: EmployeeRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(EmployeeUiState())
    val uiState: StateFlow<EmployeeUiState> = _uiState.asStateFlow()
    
    fun loadEmployees() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            val result = employeeRepository.getEmployees()
            
            result.fold(
                onSuccess = { employees ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        employees = employees.sortedBy { it.name }
                    )
                },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message
                    )
                }
            )
        }
    }
    
    fun addEmployee(name: String, position: String, role: UserRole) {
        viewModelScope.launch {
            val employee = Employee(
                id = UUID.randomUUID().toString(),
                name = name,
                position = position,
                role = role,
                status = "active"
            )
            
            val result = employeeRepository.addEmployee(employee)
            
            result.fold(
                onSuccess = { loadEmployees() },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(error = e.message)
                }
            )
        }
    }
    
    fun deleteEmployee(id: String) {
        viewModelScope.launch {
            val result = employeeRepository.deleteEmployee(id)
            
            result.fold(
                onSuccess = { loadEmployees() },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(error = e.message)
                }
            )
        }
    }
}
