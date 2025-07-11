variable "resource_group_location" {
  type        = string
  default     = "canadacentral"
  description = "Location for all resources."
}

variable "resource_group_name" {
  type        = string
  default     = "b9cee3-test-networking"
  description = "Name of the resource group."
}

variable "vnet_name" {
  type        = string
  default     = "b9cee3-test-vwan-spoke"
  description = "Existing vnet name."
}

variable "apim_subnet_prefix" {
  type        = string
  default     = "10.46.8.0/26"
  description = "The address prefix for the API Management subnet."
}

variable "container_apps_subnet_prefix" {
  type        = string
  default     = "10.46.8.64/26"
  description = "The address prefix for the Container Apps subnet."
}

variable "privateendpoint_subnet_prefix" {
  type        = string
  default     = "10.46.8.128/26"
  description = "The address prefix for the Private Endpoint subnet."
}

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

variable "database_admin_username" {
  description = "PostgreSQL administrator username"
  type        = string
  default     = "postgres_admin"
  sensitive   = true
}

variable "database_admin_password" {
  description = "PostgreSQL administrator password"
  type        = string
  default     = null
  sensitive   = true
  validation {
    condition     = var.database_admin_password == null || length(var.database_admin_password) >= 8
    error_message = "Database password must be at least 8 characters long when provided."
  }
}

/* variable "ghcr_pat" {
  description = "GitHub Container Registry Personal Access Token (PAT) for pulling images."
  type        = string
  sensitive   = true
} */