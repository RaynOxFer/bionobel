// Delivery prices based on wilaya
// Data source: Delivery company pricing table 2026
const deliveryPrices = {
    // Zone 1 - Algiers region
    '16-الجزائر': { stopdesk: 540, stopdoor: 400, zone: 1 },
    '09-البليدة': { stopdesk: 650, stopdoor: 500, zone: 1 },
    '35-بومرداس': { stopdesk: 650, stopdoor: 500, zone: 1 },
    '42-تيبازة': { stopdesk: 650, stopdoor: 500, zone: 1 },
    
    // Zone 2 - Near Algiers
    '02-الشلف': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '04-أم البواقي': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '05-باتنة': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '06-بجاية': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '10-البويرة': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '12-تبسة': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '13-تلمسان': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '14-تيارت': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '15-تيزي وزو': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '17-الجلفة': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '18-جيجل': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '19-سطيف': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '20-سعيدة': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '21-سكيكدة': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '22-سيدي بلعباس': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '23-عنابة': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '24-قالمة': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '25-قسنطينة': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '26-المدية': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '27-مستغانم': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '28-المسيلة': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '29-معسكر': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '30-ورقلة': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '31-وهران': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '32-البيض': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '34-برج بوعريريج': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '36-الطارف': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '38-تيسمسيلت': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '40-خنشلة': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '41-سوق أهراس': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '43-ميلة': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '44-عين الدفلى': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '46-عين تموشنت': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '47-غرداية': { stopdesk: 850, stopdoor: 600, zone: 2 },
    '48-غليزان': { stopdesk: 850, stopdoor: 600, zone: 2 },
    
    // Zone 3
    '03-الأغواط': { stopdesk: 900, stopdoor: 700, zone: 3 },
    '07-بسكرة': { stopdesk: 900, stopdoor: 700, zone: 3 },
    '39-الوادي': { stopdesk: 900, stopdoor: 700, zone: 3 },
    '49-توقرت': { stopdesk: 900, stopdoor: 700, zone: 3 },
    '50-المغير': { stopdesk: 900, stopdoor: 700, zone: 3 },
    '51-المنيعة': { stopdesk: 900, stopdoor: 700, zone: 3 },
    
    // Zone 4
    '01-أدرار': { stopdesk: 1000, stopdoor: 800, zone: 4 },
    '08-بشار': { stopdesk: 1000, stopdoor: 800, zone: 4 },
    '45-النعامة': { stopdesk: 1000, stopdoor: 800, zone: 4 },
    '33-إليزي': { stopdesk: 1000, stopdoor: 800, zone: 4 },
    '52-برج باجي مختار': { stopdesk: 1000, stopdoor: 800, zone: 4 },
    '53-بني عباس': { stopdesk: 1000, stopdoor: 800, zone: 4 },
    
    // Zone 5
    '11-تمنراست': { stopdesk: 1550, stopdoor: 1350, zone: 5 },
    '37-تندوف': { stopdesk: 1550, stopdoor: 1350, zone: 5 },
    '54-إن صالح': { stopdesk: 1550, stopdoor: 1350, zone: 5 },
    '55-إن قزام': { stopdesk: 1550, stopdoor: 1350, zone: 5 },
    '56-جانت': { stopdesk: 1550, stopdoor: 1350, zone: 5 }
};

// Get delivery price for a wilaya and delivery option
function getDeliveryPrice(wilaya, deliveryOption) {
    if (!wilaya || !deliveryOption) return 0;
    
    const pricing = deliveryPrices[wilaya];
    if (!pricing) return 0;
    
    return deliveryOption === 'stopdesk' ? pricing.stopdesk : pricing.stopdoor;
}

// Get zone for a wilaya
function getWilayaZone(wilaya) {
    const pricing = deliveryPrices[wilaya];
    return pricing ? pricing.zone : null;
}
