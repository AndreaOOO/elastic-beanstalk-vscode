const vscode = require("vscode")
const { exec } = require("child_process")

function activate(context) {
    let disposable = vscode.commands.registerCommand(
        "extension.ebDeploy",
        function() {
            exec("echo ehi", (err, stdout, stderr) => {
                if (err) {
                    // node couldn't execute the command
                    return
                }

                // the *entire* stdout and stderr (buffered)
                console.log(`stdout: ${stdout}`)
                console.log(`stderr: ${stderr}`)
            })
            vscode.window.showInformationMessage("Deploy")
        }
    )

    context.subscriptions.push(disposable)
}
exports.activate = activate

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
    activate,
    deactivate,
}
