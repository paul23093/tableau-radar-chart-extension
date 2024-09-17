function isMacintosh() {
  return navigator.userAgent.includes('Mac');
}

window.onload = async () => {
  let openPayload = await tableau.extensions.initializeDialogAsync();
  console.log(openPayload);

  let labelsFontSize = 14;
  let valuesFontSize = 14;

  let btnApply = document.getElementById("apply");
  let btnSubmit = document.getElementById("submit");

  btnApply.onclick = async () => {
    labelsFontSize = document.getElementById("labels-font-size").value;
    valuesFontSize = document.getElementById("values-font-size").value;
    tableau.extensions.settings.set("labelsFontSize", labelsFontSize);
    tableau.extensions.settings.set("valuesFontSize", valuesFontSize);
    await tableau.extensions.settings.saveAsync();
    console.log("Settings saved");
  };

  btnSubmit.onclick = async () => {
    labelsFontSize = document.getElementById("labels-font-size").value;
    valuesFontSize = document.getElementById("values-font-size").value;
    tableau.extensions.settings.set("labelsFontSize", labelsFontSize);
    tableau.extensions.settings.set("valuesFontSize", valuesFontSize);
    await tableau.extensions.settings.saveAsync();
    console.log("Settings saved");
    tableau.extensions.ui.closeDialog("lolololololololololololololololold");
  };

  document.onkeydown = async function (e) {
    console.log(e.code);
    switch (e.code) {
      case "Enter":
        labelsFontSize = document.getElementById("labels-font-size").value;
        valuesFontSize = document.getElementById("values-font-size").value;
        tableau.extensions.settings.set("labelsFontSize", labelsFontSize);
        tableau.extensions.settings.set("valuesFontSize", valuesFontSize);
        await tableau.extensions.settings.saveAsync();
        console.log("Settings saved");
        if ((isMacintosh() && e.metaKey) || (!isMacintosh() && e.ctrlKey)) {
          tableau.extensions.ui.closeDialog("save-close");
        }
        break;
      case "Escape":
        tableau.extensions.ui.closeDialog("close");
        break;
      default:
        break;
    }
  };

  document.getElementById("labels-font-size").value = tableau.extensions.settings.get("labelsFontSize") ?? 14;
  document.getElementById("labels-font-size").focus();
  document.getElementById("values-font-size").value = tableau.extensions.settings.get("valuesFontSize") ?? 14;
};