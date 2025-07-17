// Resource group variables

variable "resource_group_location" {
  type        = string
  default     = "canadacentral"
  description = "Location for all resources."
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group."
}

// Network variables

variable "vnet_name" {
  type        = string
  description = "Existing vnet name."
}

variable "apim_subnet_prefix" {
  type        = string
  description = "The address prefix for the API Management subnet."
}

variable "app_service_subnet_prefix" {
  type        = string
  description = "The address prefix for the Container Apps subnet."
}

variable "privateendpoint_subnet_prefix" {
  type        = string
  description = "The address prefix for the Private Endpoint subnet."
}

variable "container_image_name" {
  type        = string
  description = "Container image for the Container App."
}

variable "container_registry_url" {
  type        = string
  description = "Name of the Container Registry Server for the Container App."
}

variable "container_registry_username" {
  type        = string
  description = "Username for the Container Registry."
}

variable "container_registry_password" {
  type        = string
  description = "Password for the Container Registry."
  sensitive   = true
}

// App Service variables

variable "app_service_plan_sku" {
  description = "The SKU of the App Service Plan"
  default     = "B1"
  type        = string
  validation {
    condition     = contains(["B1", "S1", "P1v2"], var.app_service_plan_sku)
    error_message = "The app_service_plan_sku must be one of the following: B1, S1, P1v2."
  }
}

// API Management variables

variable "apim_virtual_network_type" {
  description = "The virtual network type of the API Management service"
  default     = "External"
  type        = string
  validation {
    condition     = contains(["External", "Internal", "None"], var.apim_virtual_network_type)
    error_message = "The virtual network type must be one of the following: External, Internal, None."
  }
}

variable "publisher_email" {
  default     = "test@contoso.com"
  description = "The email address of the owner of the service"
  type        = string
  validation {
    condition     = length(var.publisher_email) > 0
    error_message = "The publisher_email must contain at least one character."
  }
}

variable "publisher_name" {
  default     = "publisher"
  description = "The name of the owner of the service"
  type        = string
  validation {
    condition     = length(var.publisher_name) > 0
    error_message = "The publisher_name must contain at least one character."
  }
}

variable "sku" {
  description = "The pricing tier of this API Management service"
  default     = "Developer"
  type        = string
  validation {
    condition     = contains(["Developer", "Standard", "Premium"], var.sku)
    error_message = "The sku must be one of the following: Developer, Standard, Premium."
  }
}

variable "sku_count" {
  description = "The instance size of this API Management service."
  default     = 1
  type        = number
  validation {
    condition     = contains([1, 2], var.sku_count)
    error_message = "The sku_count must be one of the following: 1, 2."
  }
}

// Database variables

variable "postgresql_admin_login" {
  type        = string
  default     = "pgsqladmin"
  description = "The administrator login for the PostgreSQL server."
}

variable "postgresql_server_version" {
  type        = string
  default     = "16"
  description = "Version of the PostgreSQL server."
}

variable "postgresql_storage_mb" {
  type        = number
  default     = 32768
  description = "Storage size in MB for the PostgreSQL server."
}

variable "postgresql_storage_tier" {
  type        = string
  default     = "P30"
  description = "Storage tier for the PostgreSQL server."
}

variable "postgresql_auto_grow_enabled" {
  type        = bool
  default     = true
  description = "Enable auto grow for the PostgreSQL server."
}

variable "postgresql_backup_retention_days" {
  type        = number
  default     = 7
  description = "Number of days to retain backups for the PostgreSQL server."
}

variable "postgresql_geo_redundant_backup_enabled" {
  type        = bool
  default     = false
  description = "Enable geo-redundant backups for the PostgreSQL server."
}

variable "postgresql_sku_name" {
  type        = string
  default     = "B_Standard_B1ms"
  description = "SKU name for the PostgreSQL server."
}

variable "postgresql_ad_auth_enabled" {
  type        = bool
  default     = false
  description = "Enable Active Directory authentication for PostgreSQL."
}

variable "postgresql_password_auth_enabled" {
  type        = bool
  default     = true
  description = "Enable password authentication for PostgreSQL."
}