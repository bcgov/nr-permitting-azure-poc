resource "azurerm_cosmosdb_account" "cosmosdb_sql" {
  name                = "tfex-cosmos-sql-${random_string.azurerm_api_management_name.result}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = "canadacentral"
    failover_priority = 0
  }
}

resource "azurerm_cosmosdb_sql_database" "cosmosdb_sql_db" {
  name                = "tfex-cosmos-sql-db-${random_string.azurerm_api_management_name.result}"
  account_name        = azurerm_cosmosdb_account.cosmosdb_sql.name
  resource_group_name = azurerm_resource_group.rg.name
  throughput          = 400
}

resource "azurerm_private_endpoint" "cosmosdb_sql_db_private_endpoint" {
  name                = "cosmosdb_sql_db_private_endpoint"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  subnet_id           = azurerm_subnet.privateEndpoint.id
  private_service_connection {
    name                           = "cosmosdb_sql_db_privateserviceconnection"
    private_connection_resource_id = azurerm_cosmosdb_account.cosmosdb_sql.id
    is_manual_connection           = false
    subresource_names              = ["sql"]
  }
}

resource "azurerm_cosmosdb_sql_role_definition" "cosmosdb_sql_role_definition" {
  name                = "examplesqlroledef"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmosdb_sql.name
  type                = "CustomRole"
  assignable_scopes   = ["${azurerm_cosmosdb_account.cosmosdb_sql.id}/dbs/${azurerm_cosmosdb_sql_database.cosmosdb_sql_db.name}"]

  permissions {
    data_actions = ["Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/items/read"]
  }
}

resource "azurerm_cosmosdb_sql_role_assignment" "example" {
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmosdb_sql.name
  role_definition_id  = azurerm_cosmosdb_sql_role_definition.cosmosdb_sql_role_definition.id
  principal_id        = azurerm_linux_function_app.function_app.identity[0].principal_id
  scope               = "${azurerm_cosmosdb_account.cosmosdb_sql.id}/dbs/${azurerm_cosmosdb_sql_database.cosmosdb_sql_db.name}"
}