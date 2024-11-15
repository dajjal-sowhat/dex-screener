// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create admin button
    const adminButton = document.createElement('button');
    adminButton.innerHTML = 'A';
    adminButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #333;
        color: white;
        border: none;
        cursor: pointer;
        z-index: 9998;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    // Add button to body
    document.body.appendChild(adminButton);

    // Loading overlay creation function
    function createLoading() {
        const loading = document.createElement('div');
        loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

        const loadingText = document.createElement('div');
        loadingText.innerHTML = 'Loading...';
        loadingText.style.cssText = `
            color: white;
            font-size: 20px;
        `;

        loading.appendChild(loadingText);
        return loading;
    }

    // Modal creation function
    function createModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            position: relative;
            width: 90%;
            height: 90%;
            background: white;
            border-radius: 8px;
            padding: 20px;
        `;

        const closeButton = document.createElement('button');
        closeButton.innerHTML = 'X';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            padding: 5px 10px;
            color: red;
        `;

        const copyButton = document.createElement('button');
        copyButton.innerHTML = 'Copy Log Url';
        copyButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 50px;
            background: none;
            border: none;
            font-size: 12px;
            cursor: pointer;
            padding: 5px 10px;
            color: blue;
        `;

        const iframe = document.createElement('iframe');
        iframe.src = `/admin?address=${getUrlAddress()}`;
        iframe.style.cssText = `
            width: 100%;
            height: calc(100% - 20px);
            border: none;
        `;

        closeButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        copyButton.onclick = ()=>{
            if (window.overrideLogsUrl) {
                window.navigator.clipboard.writeText(window.overrideLogsUrl).catch(()=>{
                    alert("FAIL TO COPY");
                }).then(()=>{
                    alert("COPIED");
                })

            } else alert("OVERRIDE LOGS DOESN't EXISTS")
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        modalContent.appendChild(closeButton);
        modalContent.appendChild(copyButton);
        modalContent.appendChild(iframe);
        modal.appendChild(modalContent);

        return modal;
    }

    // Button click handler
    adminButton.addEventListener('click', async () => {
        const address = getUrlAddress();
        if (address) {
            // Show loading
            const loading = createLoading();
            document.body.appendChild(loading);

            try {
                // Wait for prepare history
                const final = await window.prepareHistory();
                console.log(final);
                // Set both localStorage and window property
                localStorage.setItem(address, JSON.stringify(final));

                // Remove loading and show modal
                document.body.removeChild(loading);
                const modal = createModal();
                document.body.appendChild(modal);
            } catch (error) {
                document.body.removeChild(loading);
                alert(`Error! ${error}`);
            }
        } else {
            alert('Select token first!');
        }
    });
});
