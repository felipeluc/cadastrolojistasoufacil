document.getElementById("lojistaForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {};
  formData.forEach((value, key) => {
    data[key] = value;
  });

  const status = document.getElementById("status");
  status.innerText = "Enviando...";

  fetch("https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec", {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then(() => {
      status.innerText = "Cadastro enviado com sucesso!";
      e.target.reset();
    })
    .catch((error) => {
      status.innerText = "Erro ao enviar o cadastro.";
      console.error(error);
    });
});
