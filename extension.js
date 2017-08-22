// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
require('./utils/date-format.js')
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "climbfileinfo" is now active!');

  var config = vscode.workspace.getConfiguration('climbfileinfo');
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  var disposable = vscode.commands.registerCommand('extension.climbfileinfo', function () {
    // The code you place here will be executed every time your command is executed

    // Display a message box to the user
    var editor = vscode.editor || vscode.window.activeTextEditor;
    var line = editor.selection.active.line;
    editor.edit(function (editBuilder) {
      var time = new Date().format("yyyy-MM-dd hh:mm:ss");
      var data = {
        author: config.Author,
        lastModifiedBy: config.LastModifiedBy,
        createTime: time,
        updateTime: time
      }
      try {
        var templateString = new Template(config.template).render(data);
        editBuilder.insert(new vscode.Position(line, 0), templateString);
      } catch (error) {
        console.error(error);
      }
    });
  });
  context.subscriptions.push(disposable);
  vscode.workspace.onDidSaveTextDocument(function () {
    setTimeout(function () {
      try {
        var editor = vscode.editor || vscode.window.activeTextEditor;
        var document = editor.document;
        var authorRange = null;
        var authorText = null;
        var lastTimeRange = null;
        var lastTimeText = null;
        var diff = -1;
        var lineCount = document.lineCount;
        var comment = false;
        for (var i = 0; i < lineCount; i++) {
          var linetAt = document.lineAt(i);

          var line = linetAt.text;
          line = line.trim();
          if (line.startsWith("/*") && !line.endsWith("*/")) {//是否以 /* 开头
            comment = true;//表示开始进入注释
          } else if (comment) {
            if (line.endsWith("*/")) {
              comment = false;//结束注释
            }
            var range = linetAt.range;
            if (line.indexOf('@Last\ Modified\ by') > -1) {//表示是修改人
              authorRange = range;
              authorText = ' * @Last Modified by: ' + config.LastModifiedBy;
            } else if (line.indexOf('@Last\ Modified\ time') > -1) {//最后修改时间
              var time = line.replace('@Last\ Modified\ time:', '').replace('*', '');
              var oldTime = new Date(time);
              var curTime = new Date();
              var diff = (curTime - oldTime) / 1000;
              lastTimeRange = range;
              lastTimeText = ' * @Last Modified time: ' + curTime.format("yyyy-MM-dd hh:mm:ss");
            }
            if (!comment) {
              break;//结束
            }
          }
        }
        if ((authorRange != null) && (lastTimeRange != null) && (diff > 20)) {
          setTimeout(function () {
            editor.edit(function (edit) {
              edit.replace(authorRange, authorText);
              edit.replace(lastTimeRange, lastTimeText);
            });
            document.save();
          }, 200);
        }

      } catch (error) {
        console.error(error);
      }
    }, 200);
  });
}

function getConfiguration() {
  return vscode.workspace.getConfiguration('mocha');
}

function getLineText(lineNum, editor) {
  const document = editor.document;
  if (lineNum >= document.lineCount) {
      return '';
  }
  const start = new vscode.Position(lineNum, 0);
  const lastLine = document.lineAt(lineNum);
  const end = new vscode.Position(lineNum, lastLine.text.length);
  const range = new vscode.Range(start, end);
  var t = document.getText(range);
  return t;
}

function replaceLineText(lineNum, text, editor) {
  const document = editor.document;
  if (lineNum >= document.lineCount) {
      return '';
  }
  const start = new vscode.Position(lineNum, 0);
  const lastLine = document.lineAt(lineNum);
  const end = new vscode.Position(lineNum, lastLine.text.length);
  const range = new vscode.Range(start, end);
  editor.edit(function (edit) {
      edit.replace(range, text);
  });

}
function Template(_template) {
  var fn
  var match
  var code = ['var r=[];\nvar _html = function (str) { return str.replace(/&/g, \'&amp;\').replace(/"/g, \'&quot;\').replace(/\'/g, \'&#39;\').replace(/</g, \'&lt;\').replace(/>/g, \'&gt;\'); };']
  var re = /\{\s*([a-zA-Z\.\_0-9()]+)(\s*\|\s*safe)?\s*\}/m
  var addLine = function (text) {
    code.push('r.push(\'' + text.replace(/\'/g, '\\\'').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '\');');
  };
  while (match = re.exec(_template)) {
    if (match.index > 0) {
      addLine(_template.slice(0, match.index));
    }
    if (match[2]) {
      code.push('r.push(String(this.' + match[1] + '));');
    }
    else {
      code.push('r.push(_html(String(this.' + match[1] + ')));');
    }
    _template = _template.substring(match.index + match[0].length);
  }
  addLine(_template);
  code.push('return r.join(\'\');');
  fn = new Function(code.join('\n'));
  this.render = function (model) {
    return fn.apply(model);
  };
}


exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;