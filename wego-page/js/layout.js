async function loadComponent(id, file) {
    const response = await fetch(file);

    if (!response.ok) {
        console.error("Cannot load:", file);
        return;
    }

    document.getElementById(id).innerHTML = await response.text();
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadComponent("header", "components/header.html");
    await loadComponent("footer", "components/footer.html");
});