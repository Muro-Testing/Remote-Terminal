# MCP Server Loader Skill

## Overview
Dynamically discover and load MCP (Model Context Protocol) servers from the MCP Servers directory (https://mcpservers.org) when the system needs capabilities beyond its current tools.

## When to Use
- When current tools cannot accomplish a required task
- When you need to extend system capabilities (browser automation, APIs, databases, etc.)
- When searching for specific integrations or automation tools
- Before beginning implementation of tasks requiring external services

## MCP Servers Reference
**Primary Source**: https://mcpservers.org
**Search Format**: https://mcpservers.org/search?query=[capability]

## How to Use

### Step 1: Identify Missing Capability
Determine what the system cannot do with current tools:
- Need browser automation? → Search MCP servers
- Need database access? → Search MCP servers
- Need API integration? → Search MCP servers
- Need cloud services? → Search MCP servers

### Step 2: Search MCP Servers Directory
Use web search to find relevant MCP servers:
- Search: "site:mcpservers.org [capability]"
- Example: "site:mcpservers.org browser automation"
- Example: "site:mcpservers.org database"
- Example: "site:mcpservers.org aws"

Or directly browse: https://mcpservers.org/search?query=[your-need]

### Step 3: Evaluate MCP Servers
From the search results, identify:
- **Official servers** (marked with "official" badge)
- **Installation requirements**
- **Configuration needed**
- **Capabilities provided**

### Step 4: Install and Configure
Follow the MCP server's documentation to:
1. Install the server package
2. Configure authentication if needed
3. Add to MCP configuration

## Example Workflow

```
Task: "Scrape data from a dynamic website"

1. Current tools: file operations, code execution
   → Cannot do: Dynamic web scraping

2. Search MCP servers:
   → https://mcpservers.org/search?query=web-scraping
   Found: Browserbase, Browser Use, Hyperbrowser

3. Evaluate options:
   → Browser Use (free, open-source)
   → Browserbase (cloud-based, scalable)

4. Install chosen MCP server
   → npm install @browser-use/mcp-server
   → Configure in MCP settings

5. Continue task with new capability
```

## Popular MCP Server Categories

### Browser Automation
- Browserbase - Cloud browser automation
- Chrome DevTools MCP - Control Chrome directly
- Browser Use - AI-driven browser automation
- Hyperbrowser - Scalable browser automation
- BrowserStack - Cross-browser testing

### Development Tools
- GitHub MCP - Repository management
- Docker MCP - Container management
- PostgreSQL MCP - Database operations
- Memory MCP - Persistent storage

### Cloud Services
- AWS MCP - AWS resource management
- GCP MCP - Google Cloud Platform
- Azure MCP - Microsoft Azure

## Usage in Agent Workflow

The agent-orchestrator will automatically:
1. Identify when a capability is missing
2. Search mcpservers.org for solutions
3. Recommend appropriate MCP servers
4. Guide installation and configuration

## Important Notes
- Always prefer official MCP servers when available
- Check installation requirements before proceeding
- Some MCP servers require API keys or authentication
- Review server documentation for configuration details

## MCP Server Discovery Pattern

```python
# When current tools can't do something:
"If we need [capability], we should search for MCP servers"

# Search command:
# https://mcpservers.org/search?query=[capability]

# Evaluate results:
# - Look for "official" badge
# - Check installation complexity
# - Verify compatibility with current setup
```

## Best Practices
1. Search mcpservers.org first before building custom solutions
2. Prefer well-maintained official servers
3. Test MCP server in isolation before integrating
4. Document which MCP servers are installed and why
