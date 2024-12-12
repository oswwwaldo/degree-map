// Fetch and processes our bmcc-courses.json file
async function handleJSONFile() {

    // .json file was collected through the course dog API via the network request made at https://bmcc.catalog.cuny.edu/courses
    try {
        const response = await fetch("bmcc-courses.json");  

        // If no response, then error thrown
        if (!response.ok) { 
            window.alert("Error fetching JSON file. Please check the console for more information.");
            throw new Error("Failed to fetch the JSON file.");
        }

        const jsonData = await response.json(); // Parse the JSON file and makes it useable for us

        const db = await openDatabase();
        const message = await storeData(db, jsonData.data);  
        console.log(message);
    } catch (error) {
        console.error("Error:", error);
    }
}

 // Open IndexedDB
 function openDatabase() {
    return new Promise((resolve, reject) => {

        // .json file was collected through the course dog API via the network request made at https://bmcc.catalog.cuny.edu/courses
        const request = indexedDB.open("courseCatalog", 1);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("items")) {
                // objectStore > 'items', keyPath set to 'id', id typically is formatted as "1368591-2018-02-01"
                db.createObjectStore("items", { keyPath: "id" });
            } 
        };

        request.onsuccess = (e) => {
            resolve(e.target.result);
        };

        request.onerror = (e) => {
            reject(e.target.error);
        };
    });
}

// Store data into IndexedDB
function storeData(db, data) {

    return new Promise((resolve, reject) => {
        const transaction = db.transaction("items", "readwrite");
        const store = transaction.objectStore("items");

        // Iterates through the data and stores each item into our database
        data.forEach(item => { store.put(item); console.log("Stored item:", item); });

        transaction.oncomplete = () => {
            resolve("Data stored successfully");
        };
    });
}

// Call the function to handle the JSON file
handleJSONFile();

// Our pagination count 
let currentPage = 1; 
var itemsPerPage = 9;

// Fetch data from IndexedDB and render courses
async function fetchAndRenderCourses() {
    const db = await openDatabase();
    const courses = await getAllCourses(db);

    // Calculate pagination details
    const totalCourses = courses.length;
    const totalPages = Math.ceil(totalCourses / itemsPerPage); 
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalCourses);
    const paginatedCourses = courses.slice(startIndex, endIndex);

    renderMenu(paginatedCourses);
    renderPaginationButtons(totalPages);
}

// Get all courses from IndexedDB
function getAllCourses(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("items", "readonly");
        const store = transaction.objectStore("items");
        const request = store.getAll();

        request.onsuccess = (e) => {
            resolve(e.target.result);
        };

        request.onerror = (e) => {
            reject(e.target.error);
        };
    });
}

// Render the course menu
function renderMenu(courses) {
    let courseList = "";

    courses.forEach((course) => {
        courseList += `
            <div class="course-menu__results__item" 
                data-id="${course.id}" 
                data-name="${course.name}" 
                data-code="${course.code}" 
                data-credits="${course.credits.creditHours.max}" 
                data-departments="${course.departments}">

                <div class="course-menu__results__item__code"> 
                    ${course.code} 
                </div>
                <div class="course-menu__results__item__title"> 
                    ${course.name}
                    <span class="course-menu__results__item__title__credits"> 
                        ${course.credits.creditHours.max} Credits
                    </span>
                    <button class="course-menu__results__item__btn" type="button">
                        <i class="fab fa-plus"></i>
                    </button>
                </div>
            </div>`;
    });

    // Adds in our courses as HTML to 'course-menu__results' div, which is the main container for our courses
    document.getElementById("courses").innerHTML = courseList;

    // Add event listeners for each button for click interactivity 
    document.querySelectorAll(".course-menu__results__item__btn").forEach((btn) => {
        btn.addEventListener("click", function (event) {
            event.stopPropagation();
            addToMap(btn.closest(".course-menu__results__item"));
        });
    });
}

async function fetchSearchResults() {
    const searchBtn = document.getElementById("search");
    const searchInput = searchBtn.value;
    const resultsContainer = document.getElementById("courses");
    const db = await openDatabase();
    const courses = await getAllCourses(db);

    // If search input is greater than 0, display results container
    if (searchInput.length > 0) {
        resultsContainer.style.display = "flex";
    }

    // Else, hide results container which is the default behavior
    else {
        resultsContainer.style.display = "none";
    }

    const lowerCaseInput = searchInput.toLowerCase();

    const searchResults = courses.filter((course) => {
        const lowerCaseCode = course.code.toLowerCase();
        const lowerCaseLongName = course.longName.toLowerCase();

        if (lowerCaseCode === lowerCaseInput) {
            window.alert("Found a match!"); // This code is called repeatedly if highlighting the input after first match is made. Why?
            return course.code; // Return the matching course.code
        }
    
        else if (lowerCaseLongName.includes(lowerCaseInput)) {
            return course.longName;
        }

        else {
            return false;
        }
    });
    
    // If search results returns an item, render menu--else display no results found
    if (searchResults.length > 0 ) {
        renderMenu(searchResults);
    }
    else {
        resultsContainer.innerHTML = "<p>No results found.</p>";
    }
}

// Render pagination buttons with data-page attributes for each page
function renderPaginationButtons(totalPages) {
    const paginationContainer = document.querySelector(".course-menu__pagination");
    let paginationHTML = ""; // Our variable storing visible pagination buttons
    let paginationHTMLQueue = ""; // Our variable storing not visible pagination buttons

    for (let i = 1; i <= totalPages; i++) {

        if (i < 7 ) { // Default: first seven pagination options are visible
            paginationHTML += `<button class='course-menu__pagination__btn' type='button' data-page='${i}'>${i}</button>`;
        }

        // Else if, shows the last button in the pagination
        // else if (i === totalPages) 

        else { // Else, hides the rest from view with a --hidden class modifier 
            paginationHTMLQueue += `<button class='course-menu__pagination__btn 
                                              course-menu__pagination__btn--hidden' type='button' data-page='${i}'>${i}</button>`;
            
        }
    }

    // If there are more than 7 pages of pagination buttons, add a "..." button to symbolize the rest
    if (totalPages > 7) {
        paginationHTML += `<button class='course-menu__pagination__btn' type='button' data-page='${totalPages}'>...</button>`;
    }

    paginationContainer.innerHTML = paginationHTML;

    // Add navigation buttons
    paginationContainer.prepend(createPaginationButton("previous", "&LeftArrow; Previous"));
    paginationContainer.appendChild(createPaginationButton("next", "&RightArrow; Next"));

    document.querySelectorAll(".course-menu__pagination__btn").forEach((btn) => {
        btn.addEventListener("click", (event) => {
            const direction = event.target.getAttribute("data-direction");
            const page = event.target.getAttribute("data-page");

            if (direction === "previous") {
                currentPage = Math.max(1, currentPage - 1);
            } else if (direction === "next") {
                currentPage = Math.min(totalPages, currentPage + 1);
            } else {
                currentPage = parseInt(page);
            }

            fetchAndRenderCourses();
        });
    });
}

// Create a pagination button
function createPaginationButton(direction, label) {
    const button = document.createElement("button");
    button.className = "course-menu__pagination__btn";
    button.type = "button";
    button.setAttribute("data-direction", direction);
    button.innerHTML = label;
    return button;
}

// let selectedCourses = [];
// document.getElementById("selected-courses").innerHTML = "";

let mapCourses = JSON.parse(localStorage.getItem("mapCourses")) || [];
let mapHTML = "";

// Add item to cart
function addToMap(courseCard) {
    const course = {
        id: courseCard.dataset.id,
        name: courseCard.dataset.name,
        code: courseCard.dataset.code,
        departments: courseCard.dataset.departments,
    };

    mapCourses.push(course);
    // localStorage.setItem("mapCourses", JSON.stringify(mapCourses));
    createToast(`Added ${course.longName} to the cart.`);

    mapHTML += `
        <div class="course-menu__results__item">
            <div class="course-menu__results__item__code"> ${course.code} </div>
            <div class="course-menu__results__item__title"> 
                ${course.name} 
                <span class="course-menu__results__item__title__credits"> 
                    ${course.credits}
                </span>
            </div>
        </div>`;  
        
    console.log(mapCourses);

    document.getElementById("selected-courses").innerHTML += mapHTML;

    // if (selectedCourses.firstChild != document.getElementById("year")) {
    //     document.createElement("div").setAttribute("id", "year");
    // }
    //     document.getElementById("selected-courses").classList.add("active");

}

// Creates a toast message temporarily and then deletes after timeout
function createToast(message){
    console.log("createToast(" + message + ") has been called.");
    let toast = document.createElement("div");
    toast.innerHTML = message;
    toast.classList.add("toast");
    document.body.appendChild(toast);

    setTimeout(function() {
        document.body.removeChild(toast);
    }, 4000); // 2 seconds
}

// Call the fetch and render function
handleJSONFile().then(() => {
    fetchAndRenderCourses();
});
