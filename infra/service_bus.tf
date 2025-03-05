resource "azurerm_servicebus_namespace" "servicebus_namespace" {
  name                = "tfex-servicebus-namespace-${random_string.azurerm_api_management_name.result}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "Premium"
  capacity = 1
  premium_messaging_partitions = 1
  local_auth_enabled = false
  public_network_access_enabled = false

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_servicebus_queue" "servicebus_queue" {
  name         = "tfex-servicebus-queue"
  namespace_id = azurerm_servicebus_namespace.servicebus_namespace.id
}

resource "azurerm_private_endpoint" "servicebus_private_endpoint" {
  name                = "servicebus_private_endpoint"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  subnet_id           = azurerm_subnet.privateEndpoint.id
  private_service_connection {
    name                           = "servicebus_privateserviceconnection"
    private_connection_resource_id = azurerm_servicebus_namespace.servicebus_namespace.id
    is_manual_connection           = false
    subresource_names              = ["namespace"]
  }
}