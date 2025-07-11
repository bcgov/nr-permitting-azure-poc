




/* resource "azurerm_container_registry_task" "acr_task" {
  name                  = "tfex-acr-task-${random_string.azurerm_api_management_name.result}"
  container_registry_id = azurerm_container_registry.acr.id

  platform {
    os = "Linux"
  }
  docker_step {
    dockerfile_path      = "Dockerfile"
    context_path         = "https://github.com/adamjwebb/nr-permitting-azure-poc/blob/main/src/Dockerfile"
    context_access_token = " "
    image_names          = ["helloworld:{{.Run.ID}}"]
  }
  
}

resource "azurerm_container_registry_task_schedule_run_now" "example" {
  container_registry_task_id = azurerm_container_registry_task.acr_task.id
}

az acr build --registry $ACR_NAME --image helloacrtasks:v1 --file /path/to/Dockerfile /path/to/build/context. */



/* resource "azurerm_monitor_diagnostic_setting" "function_app_diagnostics" {
  name                       = "function_app_diagnostics"
  target_resource_id         = azurerm_linux_function_app.function_app.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.example.id

  enabled_log {
    category = "FunctionAppLogs"
  }

  metric {
    category = "AllMetrics"
  }
} */

