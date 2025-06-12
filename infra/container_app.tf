resource "azurerm_container_app_environment" "container_app_env" {
  name                               = "${local.abbrs.appManagedEnvironments}${random_id.random_deployment_suffix.hex}"
  location                           = data.azurerm_resource_group.rg.location
  resource_group_name                = data.azurerm_resource_group.rg.name
  infrastructure_resource_group_name = "${data.azurerm_resource_group.rg.name}-capp-infra"
  infrastructure_subnet_id           = azapi_resource.container_apps_subnet.id
  internal_load_balancer_enabled     = true
  zone_redundancy_enabled            = false
  workload_profile {
    workload_profile_type = "Consumption"
    name                  = "Consumption"
    maximum_count         = 10
    minimum_count         = 1
  }
}

resource "azurerm_container_app" "container_app" {
  name                         = "${local.abbrs.appContainerApps}${random_id.random_deployment_suffix.hex}"
  container_app_environment_id = azurerm_container_app_environment.container_app_env.id
  resource_group_name          = data.azurerm_resource_group.rg.name
  revision_mode                = "Single"
  ingress {
    target_port = "3000"
    traffic_weight {
      label           = "production"
      percentage      = "100"
      latest_revision = true
    }
    external_enabled           = false
    transport                  = "auto"
    allow_insecure_connections = false

  }

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.container_app_identity.id]
  }

  registry {
    server   = azurerm_container_registry.acr.login_server
    identity = azurerm_user_assigned_identity.container_app_identity.id
  }

  template {
    container {
      name   = "nr-permitting-api"
      image  = "${azurerm_container_registry.acr.login_server}/nr-permitting-api:latest"
      cpu    = "0.5"
      memory = "1.0Gi"
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "PORT"
        value = "3000"
      }
      env {
        name  = "DB_HOST"
        value = azurerm_postgresql_flexible_server.postgresql_server.fqdn
      }
      env {
        name  = "DB_PORT"
        value = "5432"
      }
      env {
        name  = "DB_NAME"
        value = azurerm_postgresql_flexible_server_database.postgresql_db.name
      }
      env {
        name  = "DB_USER"
        value = azurerm_postgresql_flexible_server.postgresql_server.administrator_login
      }
      env {
        name  = "DB_PASSWORD"
        value = random_password.postgresql_admin_password.result
      }
      env {
        name  = "DB_SSL_MODE"
        value = "require"
      }
      env {
        name  = "DB_CONNECTION_TIMEOUT"
        value = "60000"
      }
      env {
        name  = "DB_POOL_MIN"
        value = "2"
      }
      env {
        name  = "DB_POOL_MAX"
        value = "10"
      }
    }
  }
}

resource "azurerm_private_endpoint" "container_app_private_endpoint" {
  name                = "${local.abbrs.privateEndpoint}${local.abbrs.appContainerApps}${random_id.random_deployment_suffix.hex}"
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name
  subnet_id           = azapi_resource.privateEndpoint_subnet.id
  private_service_connection {
    name                           = "container_app_privateserviceconnection"
    private_connection_resource_id = azurerm_container_app.container_app.id
    is_manual_connection           = false
    subresource_names              = ["containerApps"]
  }
    lifecycle {
    ignore_changes = [tags, private_dns_zone_group]
  }
}