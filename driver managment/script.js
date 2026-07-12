// Search Driver Function

const search = document.querySelector("input");

const rows = document.querySelectorAll("tbody tr");


search.addEventListener("keyup",()=>{

    let value = search.value.toLowerCase();


    rows.forEach(row=>{

        let name=row.children[0].innerText.toLowerCase();


        if(name.includes(value))
        {
            row.style.display="";
        }
        else
        {
            row.style.display="none";
        }

    });


});




// Add Driver Button

const addBtn=document.querySelector(".top-right button");


addBtn.addEventListener("click",()=>{

    alert("Add Driver feature coming soon!");

});