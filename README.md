# VSCode CMIS

Add support for a CMIS FileSystemProvider.

## Usage
Open a new workspace:

````

{
	"folders": [
		{
			"name": "sample connection template",
			"uri": "cmis://username:password@host?ssl=1&base=path/to/optional-app-context/browser-binding/also-root-path"
		},
		{
			"name": "working Alfresco example",
			"uri": "cmis://admin:admin@cmis.alfresco.com?ssl=1&base=cmisbrowser"
		}
	]
}

````

### Features
* browsing folder and opening/updating files
* Check in/Check out/Cancel check out
* Working copy information is displayed in the status bar

### TODO:
* Find a good location for CMIS actions (command palette, status bar?)
* working copy indicator in explorer (https://github.com/Microsoft/vscode/issues/54938)
* read-only mode for locked documents (https://github.com/microsoft/vscode/issues/73122)
* refresh files and folder
* issue with the explorer when a file is opened (https://github.com/microsoft/vscode/issues/74006)
* sync active editor with explorer
* open any uri directly (https://stackoverflow.com/questions/54807777/how-can-i-add-an-item-to-file-menu-in-vs-code)
* friendly configuration UI for cmis connections
* Saving file will set mediatype to binary file in Alfresco (https://github.com/agea/CmisJS/issues/60)

### not in scope for VSCode
* display CMIS actions based on item stat (https://github.com/microsoft/vscode/issues/73576) NOT IN VSCODE SCOPE