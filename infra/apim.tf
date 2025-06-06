resource "azurerm_api_management" "apim" {
  name                = "${local.abbrs.apiManagementService}${random_id.random_deployment_suffix.hex}"
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name
  virtual_network_type = var.apim_virtual_network_type
  virtual_network_configuration {
    subnet_id = azapi_resource.apim_subnet.id
  }
  publisher_email     = var.publisher_email
  publisher_name      = var.publisher_name
  sku_name            = "${var.sku}_${var.sku_count}"
  identity {
    type = "SystemAssigned"
  }
  lifecycle {
    ignore_changes = [tags]
  }
}

resource "azurerm_api_management_logger" "apim_logger" {
  name                = "apimlogger"
  api_management_name = azurerm_api_management.apim.name
  resource_group_name = data.azurerm_resource_group.rg.name

  application_insights {
    instrumentation_key = azurerm_application_insights.app_insights.instrumentation_key
  }
}

resource "azurerm_api_management_api" "service_bus_api" {
  name                  = "service-bus-operations"
  resource_group_name   = data.azurerm_resource_group.rg.name
  api_management_name   = azurerm_api_management.apim.name
  display_name          = "Service Bus Operations"
  path                  = "sb-operations"
  protocols             = ["https"]
  subscription_required = true
  revision              = "1"
}

resource "azurerm_api_management_api_operation" "send_message" {
  operation_id        = "send-message"
  api_name            = azurerm_api_management_api.service_bus_api.name
  resource_group_name = data.azurerm_resource_group.rg.name
  api_management_name = azurerm_api_management.apim.name
  display_name        = "Send Message"
  method              = "POST"
  url_template        = "/{queue_or_topic}"

  template_parameter {
    name     = "queue_or_topic"
    type     = "string"
    required = true
  }
}

resource "azurerm_api_management_api_operation_policy" "send_message_policy" {
  api_name            = azurerm_api_management_api.service_bus_api.name
  resource_group_name = data.azurerm_resource_group.rg.name
  api_management_name = azurerm_api_management.apim.name
  operation_id        = azurerm_api_management_api_operation.send_message.operation_id

  xml_content = <<XML
<policies>
    <inbound>
        <base />
        <set-variable name="queue_or_topic" value="@(context.Request.MatchedParameters["queue_or_topic"])" />
        <authentication-managed-identity resource="https://servicebus.azure.net" output-token-variable-name="msi-access-token" ignore-error="false" />
        <set-header name="Authorization" exists-action="override">
            <value>@((string)context.Variables["msi-access-token"])</value>
        </set-header>
        <set-method>POST</set-method>
        <set-body>@{
                JObject json = context.Request.Body.As<JObject>(preserveContent: true);
                return JsonConvert.SerializeObject(json);
        }</set-body>
        <set-backend-service base-url="${azurerm_servicebus_namespace.servicebus_namespace.endpoint}" />
        <rewrite-uri template="@("/" + (string)context.Variables["queue_or_topic"] +"/messages" )" copy-unmatched-params="false" />
    </inbound>
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
        <set-variable name="errorMessage" value="@{
            return new JObject(
                new JProperty("EventTime", DateTime.UtcNow.ToString()),
                new JProperty("ErrorMessage", context.LastError.Message),
                new JProperty("ErrorReason", context.LastError.Reason),
                new JProperty("ErrorSource", context.LastError.Source),
                new JProperty("ErrorScope", context.LastError.Scope),
                new JProperty("ErrorSection", context.LastError.Section)
             ).ToString();
        }" />
        <return-response>
            <set-status code="500" reason="Error" />
            <set-header name="Content-Type" exists-action="override">
                <value>application/json</value>
            </set-header>
            <set-body>@((string)context.Variables["errorMessage"])</set-body>
        </return-response>
    </on-error>
</policies>
XML
}