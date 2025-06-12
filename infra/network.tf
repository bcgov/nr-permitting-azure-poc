data "azurerm_virtual_network" "vnet" {
  name                = var.vnet_name
  resource_group_name = data.azurerm_resource_group.rg.name
}

resource "azapi_resource" "apim_subnet" {
  type      = "Microsoft.Network/virtualNetworks/subnets@2023-04-01"
  name      = "${local.abbrs.networkVirtualNetworksSubnets}apim-${random_id.random_deployment_suffix.hex}"
  parent_id = data.azurerm_virtual_network.vnet.id

  body = {
    properties = {

      # List of address prefixes in subnet
      addressPrefixes = ["${var.apim_subnet_prefix}"]

      # Attach to NSG
      networkSecurityGroup = {
        id = azurerm_network_security_group.apim_nsg.id
      }

      serviceEndpoints = [
        {
          service = "Microsoft.Sql"
          locations = [
            data.azurerm_resource_group.rg.location
          ]
        },
        {
          service = "Microsoft.Storage"
          locations = [
            data.azurerm_resource_group.rg.location
          ]
        },
        {
          service = "Microsoft.EventHub"
          locations = [
            data.azurerm_resource_group.rg.location
          ]
        },
        {
          service = "Microsoft.KeyVault"
          locations = [
            data.azurerm_resource_group.rg.location
          ]
        }
      ]

      /* routeTable = {
        id = azurerm_route_table.apim_route_table.id
      } */
    }
  }
  lifecycle {
    ignore_changes = [body.properties.serviceEndpoints]
  }
  //depends_on = [ azurerm_network_security_group.apim_nsg, azurerm_route_table.apim_route_table ]
  locks = [
    data.azurerm_virtual_network.vnet.id
  ]
}

resource "azapi_resource" "container_apps_subnet" {
  type      = "Microsoft.Network/virtualNetworks/subnets@2023-04-01"
  name      = "${local.abbrs.networkVirtualNetworksSubnets}containerapps-${random_id.random_deployment_suffix.hex}"
  parent_id = data.azurerm_virtual_network.vnet.id

  body = {
    properties = {

      # List of address prefixes in subnet
      addressPrefixes = ["${var.container_apps_subnet_prefix}"]

      # Service delegations
      delegations = [
        {
          name = "containerapps_delegation"
          properties = {
            serviceName = "Microsoft.App/environments"
            #actions     = ["Microsoft.Network/virtualNetworks/subnets/action"]
          }
        }
      ]

      # Attach to NSG
      networkSecurityGroup = {
        id = azurerm_network_security_group.containerapps_nsg.id
      }
    }
  }
  depends_on = [ azurerm_network_security_group.containerapps_nsg ]
  locks = [
    data.azurerm_virtual_network.vnet.id
  ]
}

resource "azapi_resource" "privateEndpoint_subnet" {
  type      = "Microsoft.Network/virtualNetworks/subnets@2023-04-01"
  name      = "${local.abbrs.networkVirtualNetworksSubnets}privateendpoints-${random_id.random_deployment_suffix.hex}"
  parent_id = data.azurerm_virtual_network.vnet.id

  body = {
    properties = {

      # List of address prefixes in subnet
      addressPrefixes = ["${var.privateendpoint_subnet_prefix}"]

      # Attach to NSG
      networkSecurityGroup = {
        id = azurerm_network_security_group.privateendpoints_nsg.id
      }
    }
  }
  depends_on = [ azurerm_network_security_group.privateendpoints_nsg ]
  locks = [
    data.azurerm_virtual_network.vnet.id
  ]
}

resource "azurerm_network_security_group" "apim_nsg" {
  name                = "${local.abbrs.networkNetworkSecurityGroups}apim-${random_id.random_deployment_suffix.hex}"
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name

  security_rule {
    name                       = "Client_communication_to_API_Management"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "Internet"
    destination_address_prefix = "VirtualNetwork"
  }

  security_rule {
    name                       = "Secure_Client_communication_to_API_Management"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "Internet"
    destination_address_prefix = "VirtualNetwork"
  }

  security_rule {
    name                       = "Management_endpoint_for_Azure_portal_and_Powershell"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "3443"
    source_address_prefix      = "ApiManagement"
    destination_address_prefix = "VirtualNetwork"
  }

  security_rule {
    name                       = "Dependency_on_Redis_Cache"
    priority                   = 130
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "6381-6383"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "VirtualNetwork"
  }

  security_rule {
    name                       = "Dependency_to_sync_Rate_Limit_Inbound"
    priority                   = 135
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "4290"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "VirtualNetwork"
  }

  security_rule {
    name                       = "Dependency_on_Azure_SQL"
    priority                   = 140
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "1433"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "Sql"
  }

  security_rule {
    name                       = "Dependency_for_Log_to_event_Hub_policy"
    priority                   = 150
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "5671"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "EventHub"
  }

  security_rule {
    name                       = "Dependency_on_Redis_Cache_outbound"
    priority                   = 160
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "6381-6383"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "VirtualNetwork"
  }

  security_rule {
    name                       = "Depenedency_To_sync_RateLimit_Outbound"
    priority                   = 165
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "4290"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "VirtualNetwork"
  }

  security_rule {
    name                       = "Dependency_on_Azure_File_Share_for_GIT"
    priority                   = 170
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "445"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "Storage"
  }

  security_rule {
    name                       = "Azure_Infrastructure_Load_Balancer"
    priority                   = 180
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "6390"
    source_address_prefix      = "AzureLoadBalancer"
    destination_address_prefix = "VirtualNetwork"
  }

  security_rule {
    name                       = "Publish_DiagnosticLogs_And_Metrics"
    description                = "API Management logs and metrics for consumption by admins and your IT team are all part of the management plane"
    priority                   = 185
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["443", "12000", "1886"]
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "AzureMonitor"
  }

  security_rule {
    name                       = "Connect_To_SMTP_Relay_For_SendingEmails"
    description                = "APIM features the ability to generate email traffic as part of the data plane and the management plane"
    priority                   = 190
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["25", "587", "25028"]
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "Internet"
  }

  security_rule {
    name                       = "Authenticate_To_Azure_Active_Directory"
    description                = "Connect to Azure Active Directory for developer Portal authentication or for OAuth 2 flow during any proxy authentication"
    priority                   = 200
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["80", "443"]
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "AzureActiveDirectory"
  }

  security_rule {
    name                       = "Dependency_on_Azure_Storage"
    description                = "API Management service dependency on Azure blob and Azure table storage"
    priority                   = 100
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "Storage"
  }

  security_rule {
    name                       = "Publish_Monitoring_Logs"
    priority                   = 300
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "AzureCloud"
  }

  security_rule {
    name                       = "Deny_All_Internet_Outbound"
    priority                   = 999
    direction                  = "Outbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "Internet"
  }
    lifecycle {
    ignore_changes = [tags]
  }
}

resource "azurerm_network_security_group" "containerapps_nsg" {
  # This NSG is used for the Container Apps subnet
  name                = "${local.abbrs.networkNetworkSecurityGroups}containerapps-${random_id.random_deployment_suffix.hex}"
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name
  
  # Allow outbound traffic to private endpoints subnet for database connectivity
  security_rule {
    name                       = "Allow_ContainerApps_To_PrivateEndpoints"
    priority                   = 100
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5432"
    source_address_prefix      = var.container_apps_subnet_prefix
    destination_address_prefix = var.privateendpoint_subnet_prefix
  }
  
  # Allow outbound HTTPS for general Azure services
  security_rule {
    name                       = "Allow_HTTPS_Outbound"
    priority                   = 110
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
  
  # Allow outbound HTTP for general connectivity
  security_rule {
    name                       = "Allow_HTTP_Outbound"
    priority                   = 120
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
  
  lifecycle {
    ignore_changes = [tags]
  }
}

resource "azurerm_network_security_group" "privateendpoints_nsg" {
  name                = "${local.abbrs.networkNetworkSecurityGroups}privateendpoints-${random_id.random_deployment_suffix.hex}"
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name
  
  # Allow inbound PostgreSQL traffic from Container Apps subnet
  security_rule {
    name                       = "Allow_ContainerApps_To_PostgreSQL"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5432"
    source_address_prefix      = var.container_apps_subnet_prefix
    destination_address_prefix = "*"
  }
  
  lifecycle {
    ignore_changes = [tags]
  }
}

/* resource "azurerm_route_table" "apim_route_table" {
  name                = "${local.abbrs.networkRouteTables}apim-${random_id.random_deployment_suffix.hex}"
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name

  route {
    name                   = "ApimMgmtEndpointToApimServiceTag"
    address_prefix         = "ApiManagement"
    next_hop_type          = "Internet"
  }

  route {
    name                   = "ApimToInternet"
    address_prefix         = "0.0.0.0/0"
    next_hop_type          = "Internet"
  }
      lifecycle {
    ignore_changes = [tags]
  }
} */