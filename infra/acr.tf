resource "azurerm_container_registry" "acr" {
  name                = "tfexacr${random_string.azurerm_api_management_name.result}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "Premium"
  admin_enabled       = true
}

resource "azurerm_private_endpoint" "acr_private_endpoint" {
  name                = "acr_private_endpoint"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  subnet_id           = azurerm_subnet.privateEndpoint.id
  private_service_connection {
    name                           = "acr_privateserviceconnection"
    private_connection_resource_id = azurerm_container_registry.acr.id
    is_manual_connection           = false
    subresource_names              = ["registry"]
  }
}