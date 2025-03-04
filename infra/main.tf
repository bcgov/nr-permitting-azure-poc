data azurerm_subscription "current" { }

resource "random_pet" "rg_name" {
  prefix = var.resource_group_name_prefix
}

resource "azurerm_resource_group" "rg" {
  name     = random_pet.rg_name.id
  location = var.resource_group_location
}

resource "random_string" "azurerm_api_management_name" {
  length  = 13
  lower   = true
  numeric = false
  special = false
  upper   = false
}

 resource "azurerm_api_management" "apim" {
  name                = "apiservice${random_string.azurerm_api_management_name.result}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  publisher_email     = var.publisher_email
  publisher_name      = var.publisher_name
  sku_name            = "${var.sku}_${var.sku_count}"
  identity {
    type = "SystemAssigned"
  }
} 

resource "azurerm_servicebus_namespace" "servicebus_namespace" {
  name                = "tfex-servicebus-namespace-${random_string.azurerm_api_management_name.result}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "Standard"
    identity {
        type = "SystemAssigned"
    }
  tags = {
    source = "terraform"
  }
}
resource "azurerm_servicebus_queue" "servicebus_queue" {
  name                = "tfex-servicebus-queue"
  namespace_id = azurerm_servicebus_namespace.servicebus_namespace.id
}

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


resource "azurerm_linux_function_app" "function_app" {
  name                       = "tfex-function-app-${random_string.azurerm_api_management_name.result}"
    location                   = azurerm_resource_group.rg.location
    resource_group_name        = azurerm_resource_group.rg.name

  storage_account_name       = azurerm_storage_account.storage_account.name
  storage_account_access_key = azurerm_storage_account.storage_account.primary_access_key
  service_plan_id            = azurerm_service_plan.app_service_plan.id
  app_settings = {
  }
  identity {
    type = "SystemAssigned"
  }
    functions_extension_version = "~4"
    site_config {
    use_32_bit_worker = false
     application_stack {
           node_version = "20"

/*    docker{
        registry_url = "https://mcr.microsoft.com"
        image_name = "azure-functions/node"
        image_tag = "latest"
    } */
    
    }
  }
    
  }

/* resource "azurerm_function_app_function" "function" {
  name            = "example-function-app-function"
  function_app_id = azurerm_linux_function_app.function_app.id
  language        = "TypeScript"
  test_data = jsonencode({
    "name" = "Azure"
  })
  config_json = jsonencode({
    "bindings" = [
      {
        "authLevel" = "function"
        "direction" = "in"
        "methods" = [
          "get",
          "post",
        ]
        "name" = "req"
        "type" = "serviceBusTrigger"
        "queueName" = "tfex-servicebus-queue"
      },
      {
        "direction" = "out"
        "name"      = "$return"
        "type"      = "http"
      },
    ]
  })
} */

resource "azurerm_service_plan" "app_service_plan" {
    name                = "tfex-app-service-plan-${random_string.azurerm_api_management_name.result}"
    location            = azurerm_resource_group.rg.location
    resource_group_name = azurerm_resource_group.rg.name
  os_type             = "Linux"
  sku_name = "Y1"
}

resource "azurerm_storage_account" "storage_account" {
    name                     = "tfexstorage${random_string.azurerm_api_management_name.result}"
    resource_group_name      = azurerm_resource_group.rg.name
    location                 = azurerm_resource_group.rg.location
    account_tier             = "Standard"
    account_replication_type = "LRS"
    shared_access_key_enabled = true
}

 resource "azurerm_role_assignment" "apim_servicebus_data_sender" {
    scope                = azurerm_servicebus_namespace.servicebus_namespace.id
    role_definition_name = "Azure Service Bus Data Sender"
    principal_id         = azurerm_api_management.apim.identity[0].principal_id
} 

resource "azurerm_role_assignment" "function_app_servicebus_queue_data_receiver" {
    scope                = azurerm_servicebus_queue.servicebus_queue.id
    role_definition_name = "Azure Service Bus Data Receiver"
    principal_id         = azurerm_linux_function_app.function_app.identity[0].principal_id
}