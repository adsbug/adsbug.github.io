function order(product){
    let number="918609392902";
    let message="Hello Adsbug, I want to order: "+product;
    let url="https://wa.me/"+number+"?text="+encodeURIComponent(message);
    window.open(url);
}

function customOrder(){
    let name = document.getElementById("customerName").value.trim();
    let desc = document.getElementById("customerDesc").value.trim();
    if(!name || !desc){
        alert("Please fill both fields");
        return;
    }
    let number="918609392902";
    let message="Hello Adsbug, I want to place a custom order.\nName: "+name+"\nDescription: "+desc;
    let url="https://wa.me/"+number+"?text="+encodeURIComponent(message);
    window.open(url);
    document.getElementById("customerName").value="";
    document.getElementById("customerDesc").value="";
}
