resource "azurerm_container_registry" "acr" {
  name                = "${local.abbrs.containerRegistryRegistries}${random_id.random_deployment_suffix.hex}"
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name
  sku                 = "Premium"
  admin_enabled       = true
}

resource "azurerm_private_endpoint" "acr_private_endpoint" {
  name                = "${local.abbrs.privateEndpoint}${local.abbrs.containerRegistryRegistries}${random_id.random_deployment_suffix.hex}"
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name
  subnet_id           = azurerm_subnet.privateEndpoint.id
  private_service_connection {
    name                           = "acr_privateserviceconnection"
    private_connection_resource_id = azurerm_container_registry.acr.id
    is_manual_connection           = false
    subresource_names              = ["registry"]
  }
}