# Remote Iframe Demo

Remote Iframe Demo is registered as a remote iframe micro frontend.

## Metadata

| Field | Value |
| --- | --- |
| Category | developer-tools |
| Runtime | remote |
| URL | /remote-tools/demo/index.html |

## Directory

```
remote-iframe-demo/
|-- manifest.ts
|-- package.json
\-- README.md
```

Remote tools are manifest-only packages. The platform renders their micro frontend through ToolMicroFrontendHost and does not generate a local app loader.
