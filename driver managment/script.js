// Search Driver Function
const API_URL="http://127.0.0.1:8000";
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

async function loadDrivers(){

    let response = await fetch(
        `${API_URL}/drivers`
    );

    let data = await response.json();

    console.log(data);

}


loadDrivers();

async function loadDrivers(){

    let response = await fetch(
        "http://127.0.0.1:8000/drivers"
    );

    let drivers = await response.json();

    let table = document.getElementById("driverTable");

    table.innerHTML = "";


    drivers.forEach(driver => {

        table.innerHTML += `

        <tr>

            <td>${driver.name}</td>

            <td>${driver.license}</td>

            <td>${driver.category}</td>

            <td>${driver.expiry}</td>

            <td>${driver.contact}</td>

            <td>${driver.compliance}</td>

            <td>${driver.safety}</td>

            <td>${driver.status}</td>

        </tr>

        `;

    });

}


loadDrivers();

async function loadDrivers(){

    const response = await fetch(
        "http://127.0.0.1:8000/drivers"
    );

    const drivers = await response.json();

    const table = document.getElementById("driverTable");

    table.innerHTML = "";


    drivers.forEach(driver => {

        table.innerHTML += `
        
        <tr>

            <td>${driver.name}</td>

            <td>${driver.phone}</td>

            <td>${driver.status}</td>

            <td>${driver.safety_score}</td>

        </tr>

        `;

    });

}


loadDrivers();