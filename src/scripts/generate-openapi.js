const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Import the compiled swagger configuration
const { swaggerSpec } = require('../dist/config/swagger');

/**
 * Generate OpenAPI specification files for Azure API Management
 */
async function generateOpenApiSpec() {
  try {
    console.log('Generating OpenAPI specification files...');

    // Ensure output directory exists
    const outputDir = path.join(__dirname, '..', 'docs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate JSON version
    const jsonPath = path.join(outputDir, 'openapi.json');
    fs.writeFileSync(jsonPath, JSON.stringify(swaggerSpec, null, 2));
    console.log(`✅ Generated OpenAPI JSON: ${jsonPath}`);

    // Generate YAML version (preferred for Azure API Management)
    const yamlPath = path.join(outputDir, 'openapi.yaml');
    const yamlContent = yaml.dump(swaggerSpec, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });
    fs.writeFileSync(yamlPath, yamlContent);
    console.log(`✅ Generated OpenAPI YAML: ${yamlPath}`);

    // Generate Azure API Management specific version with policies
    const azureSpec = {
      ...swaggerSpec,
      'x-ms-azure-api-management': {
        'api-version-set': {
          name: 'nr-permitting-api-versions',
          description: 'NR Permitting API Version Set',
          versioningScheme: 'Segment',
        },
        policies: {
          global: [
            'rate-limit',
            'cors',
            'validate-jwt',
            'set-header',
          ],
          inbound: [
            {
              'rate-limit': {
                calls: 100,
                'renewal-period': 60,
              },
            },
            {
              cors: {
                'allowed-origins': ['*'],
                'allowed-methods': ['GET', 'POST', 'PUT', 'DELETE'],
                'allowed-headers': ['*'],
              },
            },
            {
              'set-header': {
                name: 'X-Powered-By',
                value: 'Azure API Management',
                action: 'override',
              },
            },
          ],
        },
      },
    };

    const azureYamlPath = path.join(outputDir, 'openapi-azure.yaml');
    const azureYamlContent = yaml.dump(azureSpec, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });
    fs.writeFileSync(azureYamlPath, azureYamlContent);
    console.log(`✅ Generated Azure API Management YAML: ${azureYamlPath}`);

    console.log('\n📋 Import Instructions for Azure API Management:');
    console.log('1. Open Azure Portal and navigate to your API Management instance');
    console.log('2. Go to APIs > Add API > OpenAPI');
    console.log(`3. Upload the generated file: ${azureYamlPath}`);
    console.log('4. Configure subscription keys and policies as needed');
    console.log('5. Test the API endpoints from the Azure portal');

    console.log('\n🔗 Documentation URLs:');
    console.log(`JSON: http://localhost:3000/openapi.json`);
    console.log(`Docs: http://localhost:3000/api-docs`);

  } catch (error) {
    console.error('❌ Error generating OpenAPI specification:', error);
    process.exit(1);
  }
}

// Run the script
generateOpenApiSpec();
