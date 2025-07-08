let config = {
    'app_Mode': false,
    'theme_Index': "0",
    'use_Local_Storage': true,
    'language': (navigator.language || navigator.userLanguage).substring(0, 2),
    'max_Players': 2,
    'min_Players': 2,
};

let app_Info = {
    'app_Name': 'card2024',
    'app_Version': "0",
    'app_Icon_Type': 'div', 
    'app_Icon': `<div class="card2024 app-icon">
                    <div class="card2024 cards-container">
                        <div class="card2024 card blue-card">-1</div>
                        <div class="card2024 card red-card">+1</div>
                    </div>
                    <div class="card2024 app-name">Card-2024</div>
                    
                    <div class="card2024 decoration">
                        <div class="card2024 corner tl"></div>
                        <div class="card2024 corner tr"></div>
                        <div class="card2024 corner bl"></div>
                        <div class="card2024 corner br"></div>
                    </div>
                </div>`,
    'app_Id': "undefined",
    'run_fn': 'tab',
    'app_Url': 'apps/card2024',
}