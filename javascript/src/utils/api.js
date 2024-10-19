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
    const temp = document.createElement('div');
    temp.id = 'contributors_grid';
    temp.innerHTML = `Kindly allow us a moment to retrieve the contributors. 
    We're grateful for the many individuals who have generously put their time and effort to make this possible.`;

    contributors_view.append(temp);

    contributors_btn.addEventListener('click', (e) => {
        if (!contributors_btn.getAttribute('data-visited')) {
            contributors_btn.setAttribute('data-visited', 'true');
            const promise = getAllContributorsRecursive();
            promise.then((result) => {
                temp.innerHTML = '';
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
            });
        }
    });
}
