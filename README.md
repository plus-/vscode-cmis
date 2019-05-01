# VSCode CMIS

Add support for a CMIS FileSystemProvider.

Implementation based on https://github.com/Microsoft/vscode-extension-samples/tree/master/fsprovider-sample


## Usage
Open a new workspace:

````

{
	"folders": [
		{
			"name": "My CMIS FileSystem",
			"uri": "cmis://username:password@host?ssl=1&base=path/to/optional-app-context/browser-binding/also-root-path"
		}
	]
}

````

### TODO:
* working copy indicator
* read-only mode for locked documents

