
// BMCC Degree Map Builder - script.js //

// === TABLE OF CONTENTS ===                                            //
// 1 | Create JSON file database                                        //
//   => 1.1 | func handleJSONFile(json)                                 //
//   => 1.2 | func openDatabase()                                       //
//   => 1.3 | func storeData(db, data)                                  //
//   => 1.4 | func getAllCourses(db)                                    //

// 2 | Render database in HTML                                          //
//   => 2.1 | func fetchAndRenderCourses()                              //
//   => 2.2 | func getAllCourses(db)                                    //
//   => 2.3 | func renderMenu(courses)                                  //


// 2 | Render in course menu                                            //
// 3 | Search for courses                                               //
// 4 | Pagination buttons                                               //
// 5 | Add to cart                                                      //
// 6 | Create toast message                                             //
// ==========================                                           //

// Fetch and processes our bmcc-courses.json file
async function handleJSONFile() {
    
    try {
        const response = await fetch('bmcc-courses.json'); 
        // .json file was collected through the course dog API via the network request made at https://bmcc.catalog.cuny.edu/courses

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
        data.forEach(item => { 
            store.put(item); 
            // console.log("Stored item:", item); 
        });

        transaction.oncomplete = () => {
            resolve("Data stored successfully");
        };
    });
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
    calculateCredits();
}

// Render the course menu
function renderMenu(courses) {
    let courseList = "";

    courses.forEach((course) => {
        courseList += `
            <div class="course-menu__results__item" 
                data-id=${course.id}>
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

    // Keeps the data-attributes format
    // courses.forEach((course) => {
    //     courseList += `
    //         <div class="course-menu__results__item" 
    //             data-id="${course.id}" 
    //             data-name="${course.name}" 
    //             data-code="${course.code}" 
    //             data-credits="${course.credits.creditHours.max}" 
    //             data-departments="${course.departments}">

    //             <div class="course-menu__results__item__code"> 
    //                 ${course.code} 
    //             </div>
    //             <div class="course-menu__results__item__title"> 
    //                 ${course.name}
    //                 <span class="course-menu__results__item__title__credits"> 
    //                     ${course.credits.creditHours.max} Credits
    //                 </span>
    //                 <button class="course-menu__results__item__btn" type="button">
    //                     <i class="fab fa-plus"></i>
    //                 </button>
    //             </div>
    //         </div>`;
    // });

    // Adds in our courses as HTML to 'course-menu__results' div, which is the main container for our courses
   
    document.getElementById("courses").innerHTML = courseList;



    // Add event listeners for each button for click interactivity with a single event listener to the parent container
    document.getElementById("courses").addEventListener("click", function (event) {

        const element = event.target.closest(".course-menu__results__item");

        if (element) {
            const courseId = element.getAttribute("data-id");
            const course = courses.find(course => course.id === courseId);
            console.log(course.name + " was clicked.");
            addToMap(course);
        }
    });

}

async function fetchSearchResults() {
    const searchBtn = document.getElementById("search");
    const searchInput = searchBtn.value.trim();
    const resultsContainer = document.getElementById("courses");

    // If there is input, display results container
    resultsContainer.style.display = searchInput.length > 0 ? "flex" : "none";
    
    if (searchInput.length === 0) {
        return; // If no search input, exit early to avoid unnecessary processing
    }

    const lowerCaseInput = searchInput.toLowerCase();
    const db = await openDatabase();
    const courses = await getAllCourses(db);

    const searchResults = courses.filter((course) => {
        const lowerCaseCode = course.code.toLowerCase();
        const lowerCaseLongName = course.longName.toLowerCase();

        // Checks if course.code is a direct match or if course.longName contains the search input
        const isCodeMatch = lowerCaseCode === lowerCaseInput;
        const isLongNameMatch = lowerCaseLongName.includes(lowerCaseInput);

        // Return the course object if either condition matches
        return isCodeMatch || isLongNameMatch;
    });

    // Render results or show no results found
    if (searchResults.length > 0) {
        renderMenu(searchResults);
    } else {
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

    // Create a pagination button
    function createPaginationButton(direction, label) {
        const button = document.createElement("button");
        button.className = "course-menu__pagination__btn";
        button.type = "button";
        button.setAttribute("data-direction", direction);
        button.innerHTML = label;
        return button;
    }

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

// let selectedCourses = [];
// document.getElementById("selected-courses").innerHTML = "";

let mapCourses = JSON.parse(localStorage.getItem("mapCourses")) || [];
let mapHTML = "";

// Add item to cart
function addToMap(course) {

    mapCourses.push(course);
    createToast(`Added ${course.longName} to the cart.`);

    mapHTML += `
        <div class="year__semester__course">
            <div class="year__semester__course__code"> ${course.code} </div>
            <div class="year__semester__course__title"> 
                ${course.name} 
                <span class="year__semester__course__title__credits"> 
                    ${course.credits} Credits
                </span>
            </div>
        </div>`;
        
    console.log(mapCourses);

    document.getElementById("selectedCourses").innerHTML += mapHTML;
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

//TODO Function should dynamcially calculate the credits for each semester and return the year range of expected completion
function calculateMapYearRange() {
    let yearRange = document.getElementById("yearRange").innerText;
}

//TODO Function should dynamically calculate the credits for each semester and return the year range of expected completion
//TODO Dynamically named semesters and years
//TODO Dynamically create semester variable names and dynmaically name each semester based on their position in the index
//TODO Create a map to store semester data

// Map to store semester data for each year
let creditsMap = [];

function parseSemesterData() {
    let semesterName = null; // Name of the semester
    let semesterIndex = 0; // Tracks the index of semesters within the same year
    let currentYear = null; // Tracks the current year

    // Clear the map before re-rendering just in case
    creditsMap = [];

    // Group semesters by year
    const semestersByYear = new Map();

    document.querySelectorAll(".year__semester").forEach((semester) => {
        // Retrieve the year by traversing to the closest `.year` and fetching its header
        let yearSection = semester.closest(".year");
        let yearHeaderText = yearSection.querySelector(".year__header").innerText;
        let year = yearHeaderText.split(" ")[1]; // Extracts the numeric year part from the string

        // Add semester to the corresponding year group
        if (!semestersByYear.has(year)) {
            semestersByYear.set(year, []);
        }
        semestersByYear.get(year).push(semester);
    });

    console.log(semestersByYear);

    // Iterate over grouped semesters
    semestersByYear.forEach((semesters, year) => {
        // Get the total number of semesters for this year
        const totalSemesters = semesters.length;

        // Reset semesterIndex for the new year
        semesterIndex = 0;

        // Step 3: Process each semester within the year
        semesters.forEach((semester) => {
            // Increment semester index
            semesterIndex++;

            // Get the number of credits from the light header
            let credits = parseInt(semester.querySelector(".year__semester__header__light").innerText) || 0;

            // Decide semester name based on the totalSemesters for this year
            switch (semesterIndex) {
                // If two semesters, use Fall and Spring
                // If three semesters, use Fall, Spring, and Summer
                // If four semesters, use Fall, Winter, Spring, and Summer
                case 1:
                    semesterName = "Fall";
                    if (credits > 18) {
                        console.log("Fall semester cannot exceed 18 credits");
                    }
                    break;
                case 2:
                    semesterName = totalSemesters < 4 ? "Spring" : "Winter";
                    if (semesterName === "Spring" && credits > 18) {
                        console.log("Spring semester cannot exceed 18 credits");
                    }
                    else if (semesterName === "Winter" && credits > 4) {
                        console.log("Winter semester cannot exceed 4 credits");
                    } 
                    break;
                case 3:
                    semesterName = totalSemesters === 3 ? "Summer" : "Spring";
                    if (semesterName === "Summer" && credits > 16) {
                        console.log("Summer semester cannot exceed 18 credits");
                    }
                    else if (semesterName === "Spring" && credits > 18) {
                        console.log("Spring semester cannot exceed 18 credits");
                    } 
                    break;
                case 4:
                    semesterName = "Summer";
                    if (credits > 16) {
                        console.log("Summer semester cannot exceed 16 credits");
                    }
                    break;
                default:
                    semesterName = "Unknown";
                    console.log("Default case reached");
                    break;
            }

            // Update the semester header text
            semester.querySelector(".year__semester__header__bold").innerText = semesterName;

            // Add the semester data to the map
            creditsMap.push({
                element: semester,                  // Reference to the semester element
                credits: credits,                   // Number of credits for this semester
                semester: semesterName,             // Name of the semester
                semesterIndex: semesterIndex,       // Semester's position within the current year
                year: year,                         // Year of the semester
                totalIndex: creditsMap.length + 1,  // Overall position across all semesters
            });
        });
    });

    // Log the resulting map
    console.log("Parsed Semester Data:", creditsMap);
}



document.addEventListener("DOMContentLoaded", function() {
    
    // Adds drag and drop for courses in between semesters using dynamically generated IDs and the dataTransfer object 
    document.querySelectorAll(".year__semester__course").forEach((course, index) => {
        course.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData("text/plain", course.id); // Set the course ID in the DataTransfer object
            console.log("Drag started for:", course.id);
        });

        if (!course.id) { // If the course does not have an ID, assign one
            course.id = `course-${index}`;
        }
    });    

    document.querySelectorAll(".year__semester").forEach((semester) => {

        semester.addEventListener('dragover', function(e) {
            e.preventDefault(); // Prevent the default behavior of the browser
            console.log("Drag over");
        });

        // Drop the course into the semester
        semester.addEventListener('drop', function(e) {
            e.preventDefault(); // Prevent the default behavior of the browser
            const courseId = e.dataTransfer.getData("text/plain"); // Retrieve the course ID
            const course = document.getElementById(courseId); // Find the course element by ID
            if (course) { // If the course element exists
                semester.append(course); // Move the course element to the semester
                console.log("Dropped:", courseId, "into semester");
            } else { // If the course element does not exist, throw an error
                console.error("Dropped course not found");
            }

            //TODO calculateCredits(previousSemester); previous semester functionality needs to be calculated 
            calculateCredits(semester);
        });

    });

    //TODO Add special styling to indicate that the course is out of bounds and will be deleted if dropped
    document.getElementById("selectedCourses").addEventListener('dragover', function(e) {
        e.preventDefault();
    
        // Check if the event target or its parent is a semester element
        const semester = e.target.closest(".year__semester");
    
        if (!semester) {
            console.log("Kill zone - Out of bounds drop area");
        } else {
            console.log("Valid drop zone");
        }
    });

    // Delete course if dragged and dropped outside of semester elements
    document.getElementById("selectedCourses").addEventListener('drop', function(e) {
        e.preventDefault();

        // Check if the event target or its parent is a semester element
        const semester = e.target.closest(".year__semester");

        // Retrieve the course ID from the DataTransfer object
        const courseId = e.dataTransfer.getData("text/plain");
        const course = document.getElementById(courseId);

        // If course exists and dragged over a non-semester element, remove course
        if (course) {
            if (!semester) {
                course.remove();
                console.log("Deleted:", courseId, "out of bounds");
                calculateCredits(semester);
            }
        }
    });
    

    // Delete courses from the semester
    document.querySelectorAll(".year__semester__course__btns__remove-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
            const semester = btn.closest(".year__semester");
            const course = btn.closest(".year__semester__course");

            course.remove();
            console.log("Course (" + course.id + ") removed from semester");

            calculateCredits(); // Recalculate all credits after removing a course
        });
    });

});



//TODO Function should also take an optional previousSemester parameter to calculate the credits for that semester too
//TODO Function should take into account that other semesters have their own credits variables and not continually modify the global total 
// Function to calculate the total and per-semester credits
function calculateCredits() {
    let totalCredits = 0; // Reset total credits

    // Iterate over each semester and calculate its credits
    document.querySelectorAll(".year__semester").forEach((semester) => {
        let semesterCredits = 0; // Reset semester credits

        // Calculate credits for each course in the semester
        semester.querySelectorAll(".year__semester__course").forEach((course) => {
            let courseCredits = parseInt(course.querySelector(".year__semester__course__title__credits").innerText);
            semesterCredits += courseCredits;
        });

        // Update the semester's displayed credits
        semester.querySelector(".year__semester__header__light").innerText = `${semesterCredits} Credits`;

        // Add the semester's credits to the total
        totalCredits += semesterCredits;

        // If semester has no courses left, remove it
        if (semesterCredits === 0) 
            semester.remove();
    });

    // Update the total's displayed credits
    document.getElementById("totalCredits").innerText = `Total: ${totalCredits} Credits`;

    parseSemesterData(); // Parse the semester data after calculating credits to update results
}