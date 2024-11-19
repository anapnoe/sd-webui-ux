import {VirtualScroll} from './uiux/virtual.js';
import {DEFAULT_PATH} from '../constants.js';

//const container = document.querySelector('#civitai_cardholder');
//const searchInput = document.querySelector('#civit_search textarea');

let allData = [];
let filteredData = [];
const ITEM_HEIGHT = 50; // height of each item in pixels
const BUFFER_SIZE = 5; // additional items to render for smoother scrolling

export const fetchDataCivitAI = async() => {
    // Simulate fetching data (e.g., from an API)
    return new Promise((resolve) => {
        const data = Array.from({length: 10000}, (_, i) => `Item ${i + 1}`);
        resolve(data);
    });
};

export async function setupCivitaiBrowser888() {
    /*
    allData = await fetchDataCivitAI();
    filteredData = [...allData]; // initialize with all data

    const virtualList = new VirtualList(container, filteredData, ITEM_HEIGHT, BUFFER_SIZE);

    searchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase();
        filteredData = allData.filter(item => item.toLowerCase().includes(searchTerm));
        virtualList.updateData(filteredData); // Update the virtual list with filtered data
    });

    // Load more items when nearing the bottom of the viewport
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            virtualList.loadMore();
        }
    }, {
        root: container,
        threshold: 1.0,
    });

    // Create a sentinel element for the observer
    const sentinel = document.createElement('div');
    sentinel.classList.add('sentinel');
    container.appendChild(sentinel);
    observer.observe(sentinel);
    */

    const container = document.querySelector('#civitai_cardholder');
    const searchInput = document.querySelector('#civit_search textarea');
    const btn = document.querySelector('#btn_civitai_browser');

    // Sample data
    const data = Array.from({length: 1000}, (_, i) => `Item ${i + 1}`);


    let virtualScroll;
    btn.addEventListener('click', (event) => {
        virtualScroll = new VirtualScroll(container, data);

    });

    searchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value;
        virtualScroll.filterItems(searchTerm);
    });


    //container.addEventListener('scroll', (event) => virtualScroll.handleScroll(event));

}

export async function setupCivitaiBrowser() {
    //proxyFetchAllCivitaiData("none", "Most Reactions", "AllTime", "", 1);
    //fetchAllCheckpoints();
    //fetchAllLoras();
    fetchCivitaiData2("cool");
}

export async function initVirtualScroller(data) {
    const container = document.querySelector('#civitai_cardholder');
    const searchInput = document.querySelector('#civit_search textarea');

    // Sample data
    //const data = Array.from({length: 1000}, (_, i) => ({
    //    username: `item ${i + 1}`,
    //    url: `https://via.placeholder.com/150?text=Item+${i + 1}`, // Using placeholder image URL
    //}));

    //const data = Array.from({length: 1000}, (_, i) => ({
    //    name: `item ${i + 1}`,
    //    preview: `https://via.placeholder.com/150?text=Item+${i + 1}`, // Using placeholder image URL
    //}));

    //const data = fetchCivitaiData("None", "Most Reactions", "AllTime", "1");

    const virtualScroll = new VirtualScroll(container, data, 12);

    searchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value;
        virtualScroll.data = proxyFetchAllCivitaiData("none", "Most Reactions", "AllTime", searchTerm, 1);
        //virtualScroll.filterItems(searchTerm);
    });

}

async function fetchAllCheckpoints() {

    try {

        const response = await fetch(`${DEFAULT_PATH}data/textual_inversion.json`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.status === 200) {
            const api_data = await response.json();
            initVirtualScroller(api_data);

        } else {
            console.error(`Request failed with status: ${response.status}`);
        }

    } catch (error) {
        console.log(`Error occurred: ${error}`);
    }
}

async function fetchAllLoras() {

    try {

        const response = await fetch(`${DEFAULT_PATH}data/lora.json`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.status === 200) {
            const api_data = await response.json();
            initVirtualScroller(api_data);

        } else {
            console.error(`Request failed with status: ${response.status}`);
        }

    } catch (error) {
        console.log(`Error occurred: ${error}`);
    }
}

async function fetchAllCivitaiData(nswflvl, sortcivit, periodcivit, term, page = 1, data = [], maxPages = 1) {
    //const api_url = "https://civitai.com/api/v1/images";
    const api_url = `https://civitai.com/api/v1/models?tag=${term}`;

    try {
        const params = new URLSearchParams({
            //limit: 200,
            //nsfw: nswflvl,
            //sort: sortcivit,
            //period: periodcivit,
            //cursor: (page - 1) * 200,
        });

        const response = await fetch(`${api_url}?${params.toString()}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.status === 200) {
            const api_data = await response.json();
            data = data.concat(api_data.items); // Assuming you want to collect items

            // Check if we have fetched the maximum number of pages
            if (page < maxPages) {
                // Wait for 1 second before the next request (optional)
                await new Promise(resolve => setTimeout(resolve, 100));
                return fetchAllCivitaiData(nswflvl, sortcivit, periodcivit, term, page + 1, data, maxPages);
            } else {
                // All pages fetched, perform any final actions here
                initVirtualScroller(data); // Assuming you want to initialize with the collected data
                //return data; // Optional: return the complete data array if needed
            }

        } else {
            console.error(`Request failed with status: ${response.status}`);
        }

    } catch (error) {
        console.log(`Error occurred: ${error}`);
    }
}
/*
async function proxyFetchAllCivitaiData(nswflvl, sortcivit, periodcivit, term, page = 1, data = [], maxPages = 1) {
    const api_url = `http://127.0.0.1:7860/api/predict`;
    try {
        const response = await fetch(api_url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({data: [term]}), // Sending as JSON
        });
        if (response.ok) {
            const api_data = await response.json();
            data = data.concat(api_data.data[0].items); // Adjust based on the expected structure

            // Proceed to fetch next page if necessary
            if (page < maxPages) {
                await new Promise(resolve => setTimeout(resolve, 100)); // Optional delay
                return await proxyFetchAllCivitaiData(nswflvl, sortcivit, periodcivit, term, page + 1, data, maxPages);
            }
            return data; // Return collected data
        } else {
            console.error(`Request failed with status: ${response.status}`);
            return []; // Return empty array on error
        }
    } catch (error) {
        console.log(`Error occurred: ${error}`);
        return []; // Return empty array on error
    }
}
*/

async function fetchCivitaiData2(term) {
    const api_url = `/sd_webui_ux/civit_proxy_request`;
    try {
        const response = await fetch(api_url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({data: [term]}) // Ensure term is sent as an array within data
        });
        if (response.ok) {
            const data = await response.json();
            console.log(data);
            return data; // Return the fetched data
        } else {
            console.error(`Request failed with status: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.log(`Error occurred: ${error}`);
        return null;
    }
}

let currentPage = 1;
let isLoading = false;
let nopreview = "";
let loadedStyleIDs = [];

async function fetchCivitaiData(nswflvl, sortcivit, periodcivit, page) {
    const api_url = "https://civitai.com/api/v1/images";
    try {
        const params = new URLSearchParams({
            limit: 200,
            nsfw: nswflvl,
            sort: sortcivit,
            period: periodcivit,
            cursor: (page - 1) * 200,
        });

        const response = await fetch(`${api_url}?${params.toString()}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.status === 200) {

            const api_data = await response.json();
            initVirtualScroller(api_data.items);
            //console.log(api_data);
            //return api_data.items;

            /*
            for (const item of api_data.items || []) {
                const meta_data = item.meta;
                const title = "by " + item.username;
                const img = item.url;
                const description = item.username + " " + item.id;
                let prompt = "";
                let prompt_negative = "";
                if (meta_data) {
                    if ('prompt' in meta_data) {
                        prompt = encodeURIComponent(meta_data.prompt.replace(/'/g, '%27'));
                    }
                    if ('negativePrompt' in meta_data) {
                        prompt_negative = encodeURIComponent(meta_data.negativePrompt.replace(/'/g, '%27'));
                    }
                }
                // Generate a unique style ID based on the URL and title
                const styleID = `${item.id}`;
                if (
                    decodeURIComponent(prompt) !== "" &&
                    decodeURIComponent(prompt_negative) !== "" &&
                    loadedStyleIDs.indexOf(styleID) === -1
                ) {
                    let style_html = `
                    <div class="style_card">
                        <img class="styles_thumbnail" src="${img}">
                        <div class="EditStyleJson">
                            <button onclick="editStyle('${title}','${img}','${description}','${prompt}','${prompt_negative}','subfolder_name','encoded_filename','CivitAI')">🖉</button>
                        </div>
                        <div onclick="applyStyle('${prompt}','${prompt_negative}','CivitAI')" onmouseenter="event.stopPropagation(); hoverPreviewStyle('${prompt}','${prompt_negative}','CivitAI')" onmouseleave="hoverPreviewStyleOut()" class="styles_overlay"></div>
                        <div class="styles_title">${title}</div>
                        <p class="styles_description">${description}</p>
                    </div>`;
                    cardholderElement.innerHTML += style_html;
                    loadedStyleIDs.push(styleID);
                }
            }
            */

        } else {
            console.error(`Request failed with status: ${response.status}`);
        }

    } catch (error) {
        console.log(`Error occurred: ${error}`);
    }
}

/*

function refreshfetchCivitai(nswflvl, sortcivit, periodcivit) {
    loadedStyleIDs = [];
    const cardholderElement = document.getElementById("civitai_cardholder");
    while (cardholderElement.firstChild) {
        cardholderElement.removeChild(cardholderElement.firstChild);
    }
    currentPage = 1;
    fetchCivitai(nswflvl, sortcivit, periodcivit, currentPage);
}

function civitaiaCursorLoad(elem) {
    if (elem.scrollTop + elem.clientHeight >= elem.scrollHeight) {
        currentPage++; // Increment the current page
        const nswflvl = gradioApp().querySelector('#civit_nsfwfilter > label > div > div > div > input').value;
        const sortcivit = gradioApp().querySelector('#civit_sortfilter > label > div > div > div > input').value;
        const periodcivit = gradioApp().querySelector('#civit_periodfilter > label > div > div > div > input').value;
        fetchCivitai(nswflvl, sortcivit, periodcivit, currentPage); // Fetch new results for the next page
    }
}

async function fetchCivitai(nswflvl, sortcivit, periodcivit, page) {
    const api_url = "https://civitai.com/api/v1/images";
    const Cardslider = gradioApp().querySelector('#card_thumb_size > div > div > input');
    const cardholderElement = document.getElementById("civitai_cardholder");
    const loadingElement = document.getElementById("civitaiimages_loading");
    loadingElement.style.display = "block";
    if (isLoading) {
        return; // Prevent concurrent requests
    }

    try {
        isLoading = true;
        const params = new URLSearchParams({
            limit: 50,
            nsfw: nswflvl,
            sort: sortcivit,
            period: periodcivit,
            cursor: (page - 1) * 50,
        });

        const response = await fetch(`${api_url}?${params.toString()}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.status === 200) {
            const api_data = await response.json();

            for (const item of api_data.items || []) {
                const meta_data = item.meta;
                const title = "by " + item.username;
                const img = item.url;
                const description = item.username + " " + item.id;
                let prompt = "";
                let prompt_negative = "";
                if (meta_data) {
                    if ('prompt' in meta_data) {
                        prompt = encodeURIComponent(meta_data.prompt.replace(/'/g, '%27'));
                    }
                    if ('negativePrompt' in meta_data) {
                        prompt_negative = encodeURIComponent(meta_data.negativePrompt.replace(/'/g, '%27'));
                    }
                }
                // Generate a unique style ID based on the URL and title
                const styleID = `${item.id}`;
                if (
                    decodeURIComponent(prompt) !== "" &&
                    decodeURIComponent(prompt_negative) !== "" &&
                    loadedStyleIDs.indexOf(styleID) === -1
                ) {
                    let style_html = `
                    <div class="style_card">
                        <img class="styles_thumbnail" src="${img}">
                        <div class="EditStyleJson">
                            <button onclick="editStyle('${title}','${img}','${description}','${prompt}','${prompt_negative}','subfolder_name','encoded_filename','CivitAI')">🖉</button>
                        </div>
                        <div onclick="applyStyle('${prompt}','${prompt_negative}','CivitAI')" onmouseenter="event.stopPropagation(); hoverPreviewStyle('${prompt}','${prompt_negative}','CivitAI')" onmouseleave="hoverPreviewStyleOut()" class="styles_overlay"></div>
                        <div class="styles_title">${title}</div>
                        <p class="styles_description">${description}</p>
                    </div>`;
                    cardholderElement.innerHTML += style_html;
                    loadedStyleIDs.push(styleID);
                }
            }
            isLoading = false; // Allow the next request
        } else {
            console.error(`Request failed with status: ${response.status}`);
        }
        loadingElement.style.display = "none";
    } catch (error) {
        isLoading = false; // Handle error and allow the next request
        console.log(`Error occurred: ${error}`);
        loadingElement.style.display = "none";
    }
}

function setupcivitapi() {
    const cardholderElement = document.getElementById("civitai_cardholder");
    const dataNopreviewValue = cardholderElement.getAttribute("data-nopreview");
    nopreview = encodeURIComponent(dataNopreviewValue);
    fetchCivitai("None", "Most Reactions", "AllTime", "1");

}
*/
