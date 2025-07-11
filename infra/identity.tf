/* resource "azurerm_user_assigned_identity" "container_app_identity" {
  name                = "${local.abbrs.appContainerApps}identity-${random_id.random_deployment_suffix.hex}"
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name
} */

/* resource "azurerm_role_assignment" "container_app_acr_pull" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.container_app_identity.principal_id
} */



/* resource "azurerm_role_assignment" "apim_servicebus_data_sender" {
  scope                = azurerm_servicebus_namespace.servicebus_namespace.id
  role_definition_name = "Azure Service Bus Data Sender"
  principal_id         = azurerm_api_management.apim.identity[0].principal_id
}

resource "azurerm_role_assignment" "function_app_storage_blob_data_owner" {
  scope                = azurerm_storage_account.storage_account.id
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = azurerm_linux_function_app.function_app.identity[0].principal_id
}

resource "azurerm_role_assignment" "function_app_servicebus_queue_data_receiver" {
  scope                = azurerm_servicebus_queue.servicebus_queue.id
  role_definition_name = "Azure Service Bus Data Receiver"
  principal_id         = azurerm_linux_function_app.function_app.identity[0].principal_id
}
resource "azurerm_role_assignment" "function_app_cosmosdb_data_reader" {
  scope                = azurerm_cosmosdb_sql_database.cosmos_db.id
  role_definition_name = "Cosmos DB Data Reader"
  principal_id         = azurerm_linux_function_app.function_app.identity[0].principal_id
} */