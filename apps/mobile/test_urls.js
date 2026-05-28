const https = require('https');

const urls = [
  'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Hamburger/3D/hamburger_3d.png',
  'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Pizza/3D/pizza_3d.png',
  'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Shopping%20cart/3D/shopping_cart_3d.png',
  'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Pill/3D/pill_3d.png',
  'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Croissant/3D/croissant_3d.png',
  'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Grapes/3D/grapes_3d.png',
  'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Sushi/3D/sushi_3d.png',
  'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Cup%20with%20straw/3D/cup_with_straw_3d.png',
  'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Shortcake/3D/shortcake_3d.png',
  'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Paw%20prints/3D/paw_prints_3d.png',
  'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Wrench/3D/wrench_3d.png',
  'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Dress/3D/dress_3d.png',
  'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Mobile%20phone/3D/mobile_phone_3d.png',
  'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Leafy%20green/3D/leafy_green_3d.png',
  'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fork%20and%20knife%20with%20plate/3D/fork_and_knife_with_plate_3d.png',
  'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Convenience%20store/3D/convenience_store_3d.png'
];

urls.forEach(url => {
  https.get(url, (res) => {
    console.log(`${res.statusCode} - ${url.split('/').slice(-3)[0]}`);
  });
});
