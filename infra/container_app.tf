resource "azurerm_container_app_environment" "container_app_env" {
  name                               = "${local.abbrs.appManagedEnvironments}${random_id.random_deployment_suffix.hex}"
  location                           = data.azurerm_resource_group.rg.location
  resource_group_name                = data.azurerm_resource_group.rg.name
  infrastructure_resource_group_name = "${data.azurerm_resource_group.rg.name}-capp-infra"
  infrastructure_subnet_id           = azapi_resource.container_apps_subnet.id
  internal_load_balancer_enabled     = true
  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }
  zone_redundancy_enabled = var.container_app_environment_zone_redundancy
}

resource "azurerm_private_endpoint" "container_app_env_private_endpoint" {
  name                = "${local.abbrs.privateEndpoint}${local.abbrs.appContainerApps}${random_id.random_deployment_suffix.hex}"
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name
  subnet_id           = azapi_resource.privateEndpoint_subnet.id
  private_service_connection {
    name                           = "${azurerm_container_app_environment.container_app_env.name}_privateserviceconnection"
    private_connection_resource_id = azurerm_container_app_environment.container_app_env.id
    is_manual_connection           = false
    subresource_names              = ["managedEnvironments"]
  }
  lifecycle {
    ignore_changes = [tags, private_dns_zone_group]
  }
}

resource "azurerm_container_app" "container_app" {
  name                         = "${local.abbrs.appContainerApps}${random_id.random_deployment_suffix.hex}"
  container_app_environment_id = azurerm_container_app_environment.container_app_env.id
  resource_group_name          = data.azurerm_resource_group.rg.name
  revision_mode                = var.container_app_revision_mode
  ingress {
    target_port = var.container_app_ingress_target_port
    traffic_weight {
      label           = "production"
      percentage      = "100"
      latest_revision = true
    }
    external_enabled           = var.container_app_ingress_external_enabled
    transport                  = var.container_app_ingress_transport
    allow_insecure_connections = false
  }

  workload_profile_name = "Consumption"

  secret {
    name  = "container-registry-password"
    value = var.container_app_registry_password
  }

  secret {
    name  = "postgresql-admin-password"
    value = azurerm_postgresql_flexible_server.postgresql_server.administrator_password
  }

  template {
    container {
      name   = "nr-permitting-api"
      image  = var.container_app_image
      cpu    = "0.25"
      memory = "0.5Gi"
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "PORT"
        value = var.container_app_ingress_target_port
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
        name        = "DB_PASSWORD"
        secret_name = "postgresql-admin-password"
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

  registry {
    server               = var.container_app_registry_server
    username             = var.container_app_registry_username
    password_secret_name = "container-registry-password"
  }
}
