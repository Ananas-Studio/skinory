// ─── Skinory Azure Infrastructure ───
// Deploy: az deployment group create -g rg-skinory -f infra/main.bicep -p openaiApiKey=<key>

@description('Azure region')
param location string = resourceGroup().location

@description('Unique suffix for globally unique names')
param suffix string = uniqueString(resourceGroup().id)

@description('OpenAI API key')
@secure()
param openaiApiKey string

@description('ScrapingBee API key for e-commerce product scraping')
@secure()
param scrapingbeeApiKey string = ''

@description('PostgreSQL admin password')
@secure()
param dbPassword string

@description('Container image tag (use "init" on first deploy)')
param imageTag string = 'latest'

@description('Whether to deploy container apps (false on first run before images exist)')
param deployApps bool = false

// ─── Variables ───
var prefix = 'skinory'
var acrName = '${prefix}acr${suffix}'
var dbServerName = '${prefix}-db-${suffix}'
var envName = '${prefix}-env'
var storageName = '${prefix}stor${suffix}'
var dbName = 'skinory'
var dbUser = 'skinadmin'

// ─── Container Registry ───
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: true }
}

// ─── Log Analytics (required by Container Apps) ───
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-logs-${suffix}'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

// ─── Container Apps Environment ───
resource containerEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: envName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ─── PostgreSQL Flexible Server ───
resource dbServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: dbServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: dbUser
    administratorLoginPassword: dbPassword
    storage: { storageSizeGB: 32 }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: { mode: 'Disabled' }
  }
}

resource dbFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: dbServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource dbDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: dbServer
  name: dbName
}

// ─── Azure Storage Account (product images) ───
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: true
    minimumTlsVersion: 'TLS1_2'
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

resource productImagesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'product-images'
  properties: {
    publicAccess: 'Blob'
  }
}

// ─── Container Apps (only when deployApps=true, after images are pushed) ───
var dbConnectionString = 'postgres://${dbUser}:${uriComponent(dbPassword)}@${dbServer.properties.fullyQualifiedDomainName}:5432/${dbName}?sslmode=require'
var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'

resource apiApp 'Microsoft.App/containerApps@2024-03-01' = if (deployApps) {
  name: '${prefix}-api'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: false
        targetPort: 4000
        transport: 'http'
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        { name: 'acr-password', value: acr.listCredentials().passwords[0].value }
        { name: 'database-url', value: dbConnectionString }
        { name: 'openai-api-key', value: openaiApiKey }
        { name: 'scrapingbee-api-key', value: scrapingbeeApiKey }
        { name: 'azure-storage-conn', value: storageConnectionString }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: '${acr.properties.loginServer}/${prefix}/api:${imageTag}'
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '4000' }
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'DB_CONNECT_ON_START', value: 'true' }
            { name: 'DB_SYNC_ON_START', value: 'true' }
            { name: 'DB_SYNC_FORCE', value: 'false' }
            { name: 'OPENAI_API_KEY', secretRef: 'openai-api-key' }
            { name: 'OPENAI_MODEL', value: 'gpt-4o-mini' }
            { name: 'SCRAPINGBEE_API_KEY', secretRef: 'scrapingbee-api-key' }
            { name: 'AZURE_STORAGE_CONNECTION_STRING', secretRef: 'azure-storage-conn' }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/health', port: 4000 }
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: { path: '/health', port: 4000 }
              initialDelaySeconds: 10
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
  dependsOn: [dbDatabase, dbFirewall]
}

resource webApp 'Microsoft.App/containerApps@2024-03-01' = if (deployApps) {
  name: '${prefix}-web'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        { name: 'acr-password', value: acr.listCredentials().passwords[0].value }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: '${acr.properties.loginServer}/${prefix}/web:${imageTag}'
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            // Resolves at deploy time — both web and api are gated by same deployApps condition
            #disable-next-line BCP318
            { name: 'API_URL', value: 'https://${apiApp.properties.configuration.ingress.fqdn}' }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 5
        rules: [
          {
            name: 'http-scaling'
            http: { metadata: { concurrentRequests: '100' } }
          }
        ]
      }
    }
  }
}

resource landingApp 'Microsoft.App/containerApps@2024-03-01' = if (deployApps) {
  name: '${prefix}-landing'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3001
        transport: 'http'
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        { name: 'acr-password', value: acr.listCredentials().passwords[0].value }
      ]
    }
    template: {
      containers: [
        {
          name: 'landing'
          image: '${acr.properties.loginServer}/${prefix}/landing:${imageTag}'
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
        rules: [
          {
            name: 'http-scaling'
            http: { metadata: { concurrentRequests: '100' } }
          }
        ]
      }
    }
  }
}

// ─── Outputs ───
output acrLoginServer string = acr.properties.loginServer
output acrName string = acr.name
output dbHost string = dbServer.properties.fullyQualifiedDomainName
output environmentName string = containerEnv.name
output storageAccountName string = storageAccount.name
