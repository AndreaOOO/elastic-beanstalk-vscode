const vscode = require("vscode")
const { exec, spawn } = require("child_process")

let myStatusBarItem
let updateTimer

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
let frame = 0
let isDeploying = false

function renderSpinner() {
    myStatusBarItem.text = spinnerFrames[frame] + " Deploying"
    myStatusBarItem.tooltip = ""

    frame = (frame + 1) % spinnerFrames.length
}

function activate(context) {
    // register deploy command
    let disposable = vscode.commands.registerCommand(
        "extension.ebDeploy",
        async function() {
            const releaseName = await vscode.window.showInputBox({
                prompt: "EB Deploy - Release name (optional)",
            })
            if (releaseName === undefined) {
                return
            }

            const cwd = vscode.workspace.workspaceFolders[0].uri.fsPath

            isDeploying = true
            let spinnerInterval = setInterval(() => renderSpinner(), 100)
            const ebDeploy = spawn(
                "eb deploy",
                releaseName ? ["-l", releaseName] : [],
                { cwd, shell: true }
            )

            const outputChannel = vscode.window.createOutputChannel(
                "Elastic Beanstalk Deploy"
            )
            outputChannel.show()
            outputChannel.appendLine("Deploy began")

            ebDeploy.stdout.setEncoding("utf8")
            ebDeploy.stdout.on("data", data => {
                outputChannel.append(data)
            })

            ebDeploy.stderr.setEncoding("utf8")
            ebDeploy.stderr.on("data", data => {
                console.log(`stderr: ${data}`)
            })

            ebDeploy.on("close", code => {
                if (code === 0) {
                    vscode.window.showInformationMessage(
                        "Deploy completed successfullly"
                    )
                }
                isDeploying = false
                clearInterval(spinnerInterval)
                frame = 0
            })

            ebDeploy.on("error", err => {
                vscode.window.showInformationMessage("Deploy failed:\n" + err)
                isDeploying = false
                clearInterval(spinnerInterval)
                frame = 0
            })
        }
    )

    context.subscriptions.push(disposable)

    // create a new status bar item that we can now manage
    myStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        5
    )
    myStatusBarItem.command = "extension.ebDeploy"
    context.subscriptions.push(myStatusBarItem)

    updateStatusBarItem()
    updateTimer = setInterval(() => updateStatusBarItem(), 10000)
}
exports.activate = activate

function updateStatusBarItem() {
    if (isDeploying) {
        return
    }
    exec(
        "eb health",
        { cwd: vscode.workspace.workspaceFolders[0].uri.fsPath },
        (err, stdout, stderr) => {
            if (err) {
                vscode.window.showInformationMessage("Error:\n" + err)
                return
            }
            const [_, ebEnvName, status, date, time] = stdout
                .split(" ")
                .filter(x => x !== "")

            if (status === "Ok") {
                myStatusBarItem.text = `✔`
                myStatusBarItem.tooltip = `Status of ${ebEnvName} at ${date} ${time}`
            } else if (status === "Warning") {
                myStatusBarItem.text = `❗`
                myStatusBarItem.tooltip = `Status of ${ebEnvName} at ${date} ${time}`
            } else {
                myStatusBarItem.text = `❌`
                myStatusBarItem.tooltip = `Status of ${ebEnvName} at ${date} ${time}`
            }
            myStatusBarItem.show()
        }
    )
}

// this method is called when your extension is deactivated
function deactivate() {
    clearInterval(updateTimer)
    myStatusBarItem.hide()
}

module.exports = {
    activate,
    deactivate,
}
