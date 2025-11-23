# Whisperrnote AI System Architecture

## Overview

Whisperrnote now features a robust, pluggable AI system that allows for easy integration of multiple AI providers. The system is designed to be extensible, fault-tolerant, and easily configurable.

## Architecture Components

### 1. Core Types (`src/types/ai.ts`)
- **AIProvider**: Abstract base class for all AI providers
- **AIProviderRegistry**: Interface for managing providers
- **GenerationRequest/Result**: Standardized interfaces for AI operations
- **AIServiceConfig**: Configuration for load balancing and failover

### 2. Provider Registry (`src/lib/ai/registry.ts`)
- **DefaultAIProviderRegistry**: Manages provider registration and health checks
- **AIService**: Main service that orchestrates multiple providers
- Supports multiple load balancing strategies (round-robin, performance-based, etc.)
- Automatic failover and retry logic

### 3. Available Providers

#### Mock Provider (`src/lib/ai/providers/mock.ts`)
- **Status**: ✅ Active (Primary)
- **Purpose**: Development and fallback provider
- **Features**: Simulated responses, no API key required
- **Use case**: Development, testing, and when real AI providers are unavailable

#### Gemini Provider (`src/lib/ai/providers/gemini.ts`)
- **Status**: 🔧 Disabled (Available but not active)
- **Purpose**: Google Gemini AI integration
- **Features**: Real AI generation, streaming support, multiple models
- **Use case**: Production AI generation when enabled

## Current Configuration

The system is currently configured with:

- **Primary Provider**: Mock (for development safety)
- **Secondary Provider**: Gemini (disabled, but ready when needed)
- **Load Balancing**: Round-robin
- **Retry Attempts**: 2
- **Timeout**: 30 seconds

## Usage

### Basic Usage
```typescript
import { aiService } from '@/lib/ai-service';

const result = await aiService.generateContent(
  "Write about sustainable energy",
  "research"
);
```

### Advanced Provider Management
```typescript
import { aiProviderRegistry } from '@/lib/ai';

// Enable Gemini provider
aiProviderRegistry.setProviderEnabled('gemini', true);

// Check provider health
const health = await aiService.getServiceHealth();
console.log('Available providers:', health.availableProviders);
```

## Adding New AI Providers

To add a new AI provider:

1. **Create Provider Class**
```typescript
export class NewAIProvider extends AIProvider {
  readonly id = 'new-provider';
  readonly name = 'New AI Provider';
  // ... implement required methods
}
```

2. **Register Provider**
```typescript
import { aiProviderRegistry } from '@/lib/ai';
import { NewAIProvider } from './providers/new-provider';

const provider = new NewAIProvider(config);
aiProviderRegistry.register(provider);
```

3. **Configure Service**
```typescript
aiService.updateConfig({
  primaryProvider: 'new-provider',
  fallbackProviders: ['mock', 'gemini']
});
```

## Provider Features

### Supported Generation Types
- **topic**: Topic exploration and outlines
- **brainstorm**: Creative idea generation
- **research**: Research summaries and analysis
- **custom**: Custom user prompts

### Provider Capabilities
- Automatic health checking
- Usage metrics tracking
- Configuration validation
- Graceful error handling
- Load balancing support

## Configuration Options

### Load Balancing Strategies
- **round-robin**: Rotate through providers
- **random**: Random provider selection
- **performance**: Use fastest providers first
- **least-used**: Use providers with lowest usage

### Provider Config
```typescript
interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  defaultOptions?: GenerationOptions;
  enabled: boolean;
}
```

## Monitoring and Health

### Health Check Endpoint
The system provides health monitoring:
```typescript
const health = await aiService.getServiceHealth();
// Returns: { status, availableProviders, totalProviders, metrics }
```

### Provider Metrics
Each provider tracks:
- Total requests
- Success/failure rates
- Average response time
- Token usage
- Last used timestamp

## Security and Safety

- **API Keys**: Stored securely in environment variables
- **Validation**: All inputs validated before processing
- **Rate Limiting**: Handled by individual providers
- **Error Isolation**: Provider failures don't crash the system
- **Fallback System**: Always has working provider available

## Development vs Production

### Development Mode
- Mock provider is primary (safe, no API costs)
- Real providers disabled by default
- Easy testing and development

### Production Mode  
- Real AI providers enabled
- Mock provider as fallback
- Full monitoring and metrics
- Automatic failover

## Future Enhancements

Planned improvements:
- OpenAI provider integration
- Anthropic Claude provider
- Provider-specific caching
- Real-time provider switching UI
- Advanced prompt optimization
- Multi-provider result comparison

## Migration Notes

This new system replaces the previous direct Gemini integration. The API surface remains the same for existing components, ensuring backward compatibility while providing much more flexibility and reliability.