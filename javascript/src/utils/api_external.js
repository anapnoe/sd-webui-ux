import {REPO_NAME} from '../constants.js';

export async function getContributors(repoName = REPO_NAME, page = 1) {
    const request = await fetch(`https://api.github.com/repos/${repoName}/contributors?per_page=100&page=${page}`, {
        method: 'GET',
        headers: {'Content-Type': 'application/json'},
    });

    return await request.json();
}

export async function getAllContributorsRecursive(repoName = REPO_NAME, page = 1, allContributors = []) {
    const list = await getContributors(repoName, page);
    allContributors = allContributors.concat(list);

    if (list.length === 100) {
        return getAllContributorsRecursive(repoName, page + 1, allContributors);
    }

    return allContributors;
}

export function showContributors() {

    const contributors_btn = document.querySelector('#contributors');
    const contributors_view = document.querySelector('#contributors_tabitem');
    const contributors_parent = document.createElement('div');
    contributors_parent.className = 'flexbox col padding lrp-32';
    contributors_parent.innerHTML = `Kindly allow us a moment to retrieve the contributors. 
    We're grateful for the many individuals who have generously put their time and effort to make this possible.`;
    contributors_view.append(contributors_parent);

    contributors_btn.addEventListener('click', (e) => {
        if (!contributors_btn.getAttribute('data-visited')) {
            contributors_btn.setAttribute('data-visited', 'true');
            const promise = getAllContributorsRecursive();
            promise.then((result) => {
                contributors_parent.innerHTML = '';
                const temp = document.createElement('div');
                temp.id = 'contributors_grid';
                for (let i = 0; i < result.length; i++) {
                    const login = result[i].login;
                    const html_url = result[i].html_url;
                    const avatar_url = result[i].avatar_url;
                    temp.innerHTML += `
                        <a href="${html_url}" target="_blank" rel="noopener noreferrer nofollow" class="contributor-button flexbox col">
                            <figure><img src="${avatar_url}" lazy="true"></figure>
                            <div class="contributor-name">
                                ${login}
                            </div>
                        </a>`;
                }
                contributors_parent.append(temp);
            });
        }
    });
}

export async function requestGetData(url, callback) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        callback(data);
    } catch (error) {
        console.error('Failed to fetch metadata:', error);
    }
}

export async function requestPostData(url, params, callback) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        callback(data);
    } catch (error) {
        console.error('Failed to fetch data:', error);
    }
}

export async function getMembers(page = 1) {
    const request = await fetch(`https://app.buymeacoffee.com/api/creators/slug/dayanbayah/coffees?per_page=20&page=${page}`, {
        method: 'GET',
        headers: {'Content-Type': 'application/json'},
    });

    return await request.json();
}

export async function getAllMembersRecursive(page = 1, allMembers = []) {
    const list = await getMembers(page);
    allMembers = allMembers.concat(list.data);

    if (list.data.length > 0) {
        return getAllMembersRecursive(page + 1, allMembers);
    }
    return allMembers;
}
/*
function processMemberships(membershipData) {
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const currentDate = Date.now() - THIRTY_DAYS;
    const currentMembers = [];
    const pastMembers = [];

    console.warn(currentDate);
    
    membershipData.forEach(member => {
        const created = new Date(member.support_created_on);
        const updated = new Date(member.support_updated_on);
        const duration = updated - created;
        if (updated >= currentDate) {
            currentMembers.push({...member, duration});
        } else {
            pastMembers.push({...member, duration});
        }
    });
    
    currentMembers.sort((a, b) => b.duration - a.duration);
    pastMembers.sort((a, b) => b.duration - a.duration);

    const cleanResult = member => {
        const {duration, ...clean} = member;
        return clean;
    };
    
    return {
        currentMembers: currentMembers.map(cleanResult),
        pastMembers: pastMembers.map(cleanResult)
    };
}
*/

function processMemberships(membershipData) {
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const currentThreshold = Date.now() - THIRTY_DAYS;
    const userMap = new Map();

    const fullMonthsBetween = (start, end) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        let months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
        months += endDate.getMonth() - startDate.getMonth();
        const startDay = startDate.getDate();
        const endDay = endDate.getDate();
        if (endDay < startDay) months--;
        return Math.max(1, months);
    };

    membershipData.forEach(record => {
        const userId = record.fk_user_id;
        const startDate = new Date(record.support_created_on);
        const endDate = new Date(record.support_updated_on);
        
        if (!userMap.has(userId)) {
            userMap.set(userId, {
                ...record,
                periods: [{startDate, endDate}],
                firstCreated: startDate,
                lastUpdated: endDate
            });
        } else {
            const userData = userMap.get(userId);
            userData.periods.push({startDate, endDate});
            if (startDate < userData.firstCreated) userData.firstCreated = startDate;
            if (endDate > userData.lastUpdated) userData.lastUpdated = endDate;
        }
    });

    for (const userData of userMap.values()) {
        userData.periods.sort((a, b) => a.startDate - b.startDate);
        const mergedPeriods = [userData.periods[0]];
        for (let i = 1; i < userData.periods.length; i++) {
            const last = mergedPeriods[mergedPeriods.length-1];
            const current = userData.periods[i];
            if (current.startDate <= last.endDate) {
                last.endDate = current.endDate > last.endDate ? current.endDate : last.endDate;
            } else {
                mergedPeriods.push(current);
            }
        }
        
        userData.num_months_support = mergedPeriods.reduce((total, period) => {
            return total + fullMonthsBetween(period.startDate, period.endDate);
        }, 0);
        
        userData.support_created_on = userData.firstCreated;
        userData.support_updated_on = userData.lastUpdated;
    }

    const currentMembers = [];
    const pastMembers = [];

    for (const userData of userMap.values()) {
        const record = {
            ...userData,
            support_created_on: userData.support_created_on.toISOString(),
            support_updated_on: userData.support_updated_on.toISOString(),
            num_months_support: userData.num_months_support
        };
        
        if (userData.lastUpdated.getTime() >= currentThreshold) {
            currentMembers.push(record);
        } else {
            pastMembers.push(record);
        }
    }

    currentMembers.sort((a, b) => b.num_months_support - a.num_months_support);
    pastMembers.sort((a, b) => b.num_months_support - a.num_months_support);

    const cleanResult = ({ periods, firstCreated, lastUpdated, ...clean }) => clean;
    
    return {
        currentMembers: currentMembers.map(cleanResult),
        pastMembers: pastMembers.map(cleanResult)
    };
}

function createMemberItem(currentMember){
    let profile_name = currentMember.supporter_name;
    const avatar_url = currentMember.profile_picture_url;
    const avatar_img = avatar_url.includes("/default") ?  `https://robohash.org/${currentMember.fk_user_id}` : avatar_url;
    //const avatar_img = avatar_url.includes("/default") ?  `https://api.dicebear.com/9.x/pixel-art/svg?seed=${currentMember.fk_user_id}` : avatar_url;
    
    if(currentMember.fk_user_id == "7367914"){profile_name = "Bruce";}

    return `
        <a href="#" target="_blank" rel="noopener noreferrer nofollow" class="sponsors-button flexbox col">
            <figure style="background-image: url(${avatar_img})" lazy="true"></figure>
            <div class="sponsors-name">
                ${profile_name} 
            </div>
            <span class="sponsors-coffee">
                ${currentMember.num_months_support}
            </span>
        </a>`;
}

export function showMembers() {
    const sponsors_btn = document.querySelector('#sponsors');
    const sponsors_view = document.querySelector('#sponsors_tabitem');
    const sponsors_parent = document.createElement('div');
    sponsors_parent.className = 'flexbox col padding lrp-32';
    sponsors_parent.innerHTML = `Kindly allow us a moment to retrieve our sponsors.`;
    sponsors_view.append(sponsors_parent);

    sponsors_btn.addEventListener('click', (e) => {
        if (!sponsors_btn.getAttribute('data-visited')) {
            sponsors_btn.setAttribute('data-visited', 'true');
            const promise = getAllMembersRecursive();
            promise.then((result) => {
                sponsors_parent.innerHTML = '';
                const asp_el = document.createElement('div');
                asp_el.innerHTML = `
                <h2>Current Supporters</h2>
                <p>We're deeply grateful to the individuals currently supporting this project through their sponsorships.</p>
                `;
                sponsors_parent.append(asp_el);

                const temp = document.createElement('div');
                temp.className = 'sponsors_grid current';
                const procMembers = processMemberships(result);
                //console.warn(procMembers);

                const currentMembers = procMembers.currentMembers;
                for (let i = 0; i < currentMembers.length; i++) {
                    temp.innerHTML += createMemberItem(currentMembers[i]);
                }
                sponsors_parent.append(temp);

                const psp_el = document.createElement('div');
                psp_el.innerHTML = `
                <br><br><br>
                <h2>Former Supporters</h2>
                <p>We extend our sincere appreciation to all who have generously sponsored this initiative in the past.</p>
                `;
                sponsors_parent.append(psp_el);

                const pastMembers = procMembers.pastMembers;
                const temp2 = document.createElement('div');
                temp2.className = 'sponsors_grid';
                temp2.innerHTML = '';
                for (let i = 0; i < pastMembers.length; i++) {
                    temp2.innerHTML += createMemberItem(pastMembers[i]);
                }
                sponsors_parent.append(temp2);

            });
        }
    });
}


