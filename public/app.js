const BUSINESS_TYPES = [
  { id: "restaurant", label: "Restaurant", icon: "🍕", aliases: "food cafe burrito taco bar bakery food stall dining" },
  { id: "grocery", label: "Grocery", icon: "🛒", aliases: "market produce supermarket bodega" },
  { id: "retail", label: "Retail", icon: "🛍️", aliases: "store shop clothing goods storefront" },
  { id: "salon", label: "Salon", icon: "✂️", aliases: "beauty nails spa hair" },
  { id: "barbershop", label: "Barbershop", icon: "🪒", aliases: "barber haircuts grooming" },
  { id: "laundromat", label: "Laundromat", icon: "💧", aliases: "laundry wash dryclean" },
  { id: "pharmacy", label: "Pharmacy", icon: "💊", aliases: "drug store health medicine" },
  { id: "daycare", label: "Daycare", icon: "🏠", aliases: "childcare kids school" },
  { id: "auto repair", label: "Auto repair", icon: "🚗", aliases: "mechanic garage vehicles" },
  { id: "food stall", label: "Food stall", icon: "🌮", aliases: "campus cart kiosk popup vendor" },
  { id: "coffee shop", label: "Coffee shop", icon: "☕", aliases: "cafe espresso drinks pastries" },
  { id: "liquor store", label: "Liquor store", icon: "🍾", aliases: "alcohol market bottle shop" }
];

const DEFAULT_STORES = [
  {
    id: "sf-demo",
    businessName: "Dhrumil's SF Shop",
    businessType: "restaurant",
    address: "412 Mission St",
    address2: "",
    city: "San Francisco",
    state: "CA",
    zip: "",
    country: "US",
    lat: 37.7909,
    lon: -122.3971,
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    legalStructure: "LLC",
    founded: "2021",
    fullTimeStaff: "5",
    partTimeStaff: "",
    avgTicket: "$14.20",
    dailyRevenue: "",
    inventoryValue: "",
    suppliers: "",
    backupPower: "",
    securitySystem: "",
    insuranceCarrier: "",
    languages: "",
    licenseNotes: "",
    documentNotes: "",
    storeNotes: "",
    licenses: [],
    documents: [],
    risk: 0,
    opportunity: 0,
    radiusMeters: 0
  }
];

const LANGUAGE_META = {
  en: { html: "en" },
  es: { html: "es" },
  zh: { html: "zh-Hans" },
  vi: { html: "vi" },
  fil: { html: "fil" }
};

const TRANSLATIONS = {
  en: {
    translate: "Translate",
    checks: "Checks",
    plays: "Plays",
    alerts: "Alerts",
    notes: "Notes",
    email: "Email",
    pdf: "PDF",
    scan: "Scan",
    scanning: "Scanning...",
    restock: "Restock",
    addStore: "+ Add",
    viewInfo: "📋 View stored info",
    editStore: "✏️ Edit store profile",
    searchStores: "Search stores, owners, cities",
    storeNotes: "Notes",
    restockSearch: "Search chairs, takeout containers, gloves, receipt paper...",
    compareSuppliers: "🔎 Compare suppliers",
    askStore: "Ask about this store...",
    overview: "📊 Overview",
    storeInfo: "🏪 Store Info",
    opportunities: "💡 Opportunities",
    warnings: "⚠️ Warnings",
    weather: "🌤️ Weather"
  },
  es: {
    translate: "Traducir",
    checks: "Revisiones",
    plays: "Jugadas",
    alerts: "Alertas",
    notes: "Notas",
    email: "Correo",
    pdf: "PDF",
    scan: "Escanear",
    scanning: "Escaneando...",
    restock: "Suministros",
    addStore: "+ Agregar",
    viewInfo: "📋 Ver datos",
    editStore: "✏️ Editar tienda",
    searchStores: "Buscar tiendas, dueños, ciudades",
    storeNotes: "Notas",
    restockSearch: "Buscar sillas, envases, guantes, papel de recibo...",
    compareSuppliers: "🔎 Comparar proveedores",
    askStore: "Pregunta sobre esta tienda...",
    overview: "📊 Resumen",
    storeInfo: "🏪 Tienda",
    opportunities: "💡 Oportunidades",
    warnings: "⚠️ Alertas",
    weather: "🌤️ Clima"
  },
  zh: {
    translate: "翻译",
    checks: "检查",
    plays: "机会",
    alerts: "警报",
    notes: "笔记",
    email: "邮件",
    pdf: "PDF",
    scan: "扫描",
    scanning: "扫描中...",
    restock: "补货",
    addStore: "+ 添加",
    viewInfo: "📋 店铺信息",
    editStore: "✏️ 编辑店铺",
    searchStores: "搜索店铺、店主、城市",
    storeNotes: "笔记",
    restockSearch: "搜索椅子、外卖盒、手套、收据纸...",
    compareSuppliers: "🔎 比较供应商",
    askStore: "询问这家店...",
    overview: "📊 概览",
    storeInfo: "🏪 店铺信息",
    opportunities: "💡 机会",
    warnings: "⚠️ 警报",
    weather: "🌤️ 天气"
  },
  vi: {
    translate: "Dịch",
    checks: "Kiểm tra",
    plays: "Cơ hội",
    alerts: "Cảnh báo",
    notes: "Ghi chú",
    email: "Email",
    pdf: "PDF",
    scan: "Quét",
    scanning: "Đang quét...",
    restock: "Nhập hàng",
    addStore: "+ Thêm",
    viewInfo: "📋 Xem thông tin",
    editStore: "✏️ Sửa cửa hàng",
    searchStores: "Tìm cửa hàng, chủ, thành phố",
    storeNotes: "Ghi chú",
    restockSearch: "Tìm ghế, hộp mang đi, găng tay, giấy hóa đơn...",
    compareSuppliers: "🔎 So sánh nhà cung cấp",
    askStore: "Hỏi về cửa hàng này...",
    overview: "📊 Tổng quan",
    storeInfo: "🏪 Cửa hàng",
    opportunities: "💡 Cơ hội",
    warnings: "⚠️ Cảnh báo",
    weather: "🌤️ Thời tiết"
  },
  fil: {
    translate: "Isalin",
    checks: "Suriin",
    plays: "Oportunidad",
    alerts: "Babala",
    notes: "Notes",
    email: "Email",
    pdf: "PDF",
    scan: "Scan",
    scanning: "Nag-scan...",
    restock: "Restock",
    addStore: "+ Dagdag",
    viewInfo: "📋 Tingnan info",
    editStore: "✏️ I-edit store",
    searchStores: "Hanapin ang store, owner, city",
    storeNotes: "Notes",
    restockSearch: "Maghanap ng chairs, containers, gloves, receipt paper...",
    compareSuppliers: "🔎 Ihambing suppliers",
    askStore: "Magtanong tungkol sa store...",
    overview: "📊 Overview",
    storeInfo: "🏪 Store Info",
    opportunities: "💡 Oportunidad",
    warnings: "⚠️ Babala",
    weather: "🌤️ Panahon"
  }
};

const PAGE_TRANSLATION_PHRASES = {
  es: {
    "Stores": "Tiendas",
    "Store": "Tienda",
    "Risk index": "Índice de riesgo",
    "Opportunity index": "Índice de oportunidad",
    "Monitoring Area": "Área monitoreada",
    "City Checks": "Revisiones de la ciudad",
    "Actionable Warnings": "Alertas accionables",
    "Opportunity Plays": "Jugadas de oportunidad",
    "Weather Window": "Ventana climática",
    "City Signals": "Señales de la ciudad",
    "Owner decisions to review": "Decisiones que el dueño debe revisar",
    "Profit, traffic or conversion plays": "Jugadas para ganancia, tráfico o conversión",
    "Rain, heat, wind and staffing impact": "Impacto de lluvia, calor, viento y personal",
    "Concise owner cards below": "Tarjetas concisas para el dueño abajo",
    "Computed from city after refresh": "Calculado desde la ciudad después de actualizar",
    "Weather, safety, access, permits, market": "Clima, seguridad, acceso, permisos, mercado",
    "Waiting": "Esperando",
    "Updated now": "Actualizado ahora",
    "Refreshing city checks": "Actualizando revisiones de la ciudad",
    "Looking for plain business actions: weather, safety, access, permits, nearby competition and demand changes.": "Buscando acciones claras para el negocio: clima, seguridad, acceso, permisos, competencia cercana y cambios de demanda.",
    "Possible permit or rule change to review": "Posible cambio de permiso o regla para revisar",
    "California seller's permit": "Permiso de vendedor de California",
    "Opportunities": "Oportunidades",
    "Warnings": "Alertas",
    "Weather & Climate": "Clima",
    "Store Notes": "Notas de la tienda",
    "Notes": "Notas",
    "Restock": "Reabastecer",
    "Added": "Agregado",
    "About": "Sobre",
    "saved for": "guardadas para",
    "Search stores, owners, cities": "Buscar tiendas, dueños, ciudades",
    "Search": "Buscar",
    "owners": "dueños",
    "cities": "ciudades",
    "Stored locally": "Guardado localmente",
    "Open supplier links to confirm live price and stock.": "Abra enlaces de proveedores para confirmar precio y stock en vivo.",
    "WebstaurantStore is a strong compare point for delivery and pickup packaging": "WebstaurantStore es una buena referencia para empaques de entrega y recogida",
    "restaurant supply volume": "volumen de suministros para restaurante",
    "bulk case": "caja mayorista",
    "count": "unidades",
    "Compliance and Licensing": "Cumplimiento y licencias",
    "Crime and Safety": "Seguridad y delitos",
    "Infrastructure": "Infraestructura",
    "Market and Competition": "Mercado y competencia",
    "Media and Market": "Medios y mercado",
    "Regional Hazards": "Riesgos regionales",
    "Market positioning": "Posicionamiento de mercado",
    "Check nearby competitors before choosing this week's offer": "Revise competidores cercanos antes de elegir la oferta de esta semana",
    "Better discovery and conversion": "Mejor visibilidad y conversión",
    "Why it matters:": "Por qué importa:",
    "Why it matters": "Por qué importa",
    "Do this:": "Haga esto:",
    "Do this": "Haga esto",
    "Customers may compare you with nearby places": "Los clientes pueden compararlo con negocios cercanos",
    "Compare their hours, photos, menu/service clarity and prices. Choose one thing you can make clearer or better this week.": "Compare sus horarios, fotos, claridad del menú/servicio y precios. Elija una cosa que pueda hacer más clara o mejor esta semana.",
    "Verify your hours": "Verifique sus horarios",
    "Update photos/menu": "Actualice fotos/menú",
    "Compare one offer": "Compare una oferta",
    "Improve one listing": "Mejore un perfil",
    "View evidence": "Ver evidencia",
    "Based on saved store profile": "Basado en el perfil guardado",
    "Add to notes": "Agregar a notas",
    "Remove": "Eliminar",
    "Weather": "Clima",
    "Hottest day": "Día más caluroso",
    "Stock for hot-weather purchases": "Abastezca para compras por calor",
    "Higher basket size on hot days": "Mayor ticket en días calurosos",
    "The forecast shows a high near": "El pronóstico muestra una máxima cerca de",
    "this week": "esta semana",
    "Stock cold drinks, quick lunch items and extra ice; pre-chill before afternoon traffic.": "Abastezca bebidas frías, comidas rápidas y hielo extra; enfríe antes del tráfico de la tarde.",
    "Check cold storage": "Revise almacenamiento frío",
    "Place impulse items": "Coloque artículos de impulso",
    "Prep staff talking points": "Prepare mensajes para el personal",
    "Review HVAC load": "Revise carga de climatización",
    "High / low": "Máx. / mín.",
    "Rain": "Lluvia",
    "Wind": "Viento",
    "Forecast": "Pronóstico",
    "Restaurant": "Restaurante",
    "Retail": "Tienda minorista",
    "Grocery": "Mercado",
    "Food stall": "Puesto de comida",
    "Coffee shop": "Cafetería",
    "Pharmacy": "Farmacia",
    "Laundromat": "Lavandería",
    "Salon": "Salón",
    "Barbershop": "Barbería",
    "Daycare": "Guardería",
    "Auto repair": "Taller mecánico",
    "Location": "Ubicación",
    "City": "Ciudad",
    "Actions": "Acciones",
    "actions": "acciones",
    "signals": "señales",
    "owner actions": "acciones del dueño",
    "7 day forecast": "pronóstico de 7 días",
    "7 days": "7 días",
    "city-wide": "en toda la ciudad",
    "scan around": "escaneo alrededor de",
    "in Santa Clara": "en Santa Clara",
    "Not set": "No configurado",
    "Saved profile": "Perfil guardado",
    "Business name": "Nombre del negocio",
    "Business type": "Tipo de negocio",
    "Owner": "Dueño",
    "Legal structure": "Estructura legal",
    "Staff": "Personal",
    "Revenue profile": "Perfil de ingresos",
    "Inventory exposure": "Inventario en riesgo",
    "Continuity": "Continuidad",
    "Security": "Seguridad",
    "Private operating notes": "Notas operativas privadas",
    "Search what the store needs to restock.": "Busque lo que la tienda necesita reabastecer.",
    "Compare suppliers": "Comparar proveedores",
    "Storefront": "Proveedor",
    "Top product": "Producto principal",
    "Price and unit": "Precio y unidad",
    "Reviews / demand": "Reseñas / demanda",
    "Stock and timing": "Stock y tiempos",
    "Owner action": "Acción del dueño",
    "View / buy": "Ver / comprar"
  },
  zh: {
    "Stores": "店铺",
    "Store": "店铺",
    "Risk index": "风险指数",
    "Opportunity index": "机会指数",
    "Monitoring Area": "监测区域",
    "City Checks": "城市检查",
    "Actionable Warnings": "可执行警报",
    "Opportunity Plays": "机会行动",
    "Weather Window": "天气窗口",
    "City Signals": "城市信号",
    "Owner decisions to review": "需要店主审查的决定",
    "Profit, traffic or conversion plays": "利润、客流或转化行动",
    "Rain, heat, wind and staffing impact": "降雨、炎热、风和人员影响",
    "Concise owner cards below": "下方为店主简明卡片",
    "Computed from city after refresh": "刷新后根据城市计算",
    "Weather, safety, access, permits, market": "天气、安全、通行、许可、市场",
    "Waiting": "等待中",
    "Updated now": "刚刚更新",
    "Refreshing city checks": "正在刷新城市检查",
    "Looking for plain business actions: weather, safety, access, permits, nearby competition and demand changes.": "正在查找清晰的商业行动：天气、安全、通行、许可、附近竞争和需求变化。",
    "Possible permit or rule change to review": "可能需要审查的许可或规则变化",
    "California seller's permit": "加州销售许可",
    "Opportunities": "机会",
    "Warnings": "警报",
    "Weather & Climate": "天气与气候",
    "Store Notes": "店铺笔记",
    "Notes": "笔记",
    "Restock": "补货",
    "Added": "添加于",
    "About": "关于",
    "saved for": "已保存给",
    "Search stores, owners, cities": "搜索店铺、店主、城市",
    "Search": "搜索",
    "owners": "店主",
    "cities": "城市",
    "Stored locally": "本地保存",
    "Open supplier links to confirm live price and stock.": "打开供应商链接确认实时价格和库存。",
    "WebstaurantStore is a strong compare point for delivery and pickup packaging": "WebstaurantStore 是比较配送和自取包装的好参考",
    "restaurant supply volume": "餐厅用品量",
    "bulk case": "批发箱",
    "count": "数量",
    "Compliance and Licensing": "合规与许可",
    "Crime and Safety": "犯罪与安全",
    "Infrastructure": "基础设施",
    "Market and Competition": "市场与竞争",
    "Media and Market": "媒体与市场",
    "Regional Hazards": "区域风险",
    "Market positioning": "市场定位",
    "Check nearby competitors before choosing this week's offer": "选择本周优惠前先检查附近竞争对手",
    "Better discovery and conversion": "提高曝光和转化",
    "Why it matters:": "为什么重要：",
    "Why it matters": "为什么重要",
    "Do this:": "这样做：",
    "Do this": "这样做",
    "Customers may compare you with nearby places": "顾客可能会把你和附近商家比较",
    "Compare their hours, photos, menu/service clarity and prices. Choose one thing you can make clearer or better this week.": "比较他们的营业时间、照片、菜单/服务清晰度和价格。本周选择一项做得更清楚或更好。",
    "Verify your hours": "确认营业时间",
    "Update photos/menu": "更新照片/菜单",
    "Compare one offer": "比较一个优惠",
    "Improve one listing": "优化一个商家页面",
    "View evidence": "查看依据",
    "Based on saved store profile": "基于已保存店铺资料",
    "Add to notes": "添加到笔记",
    "Remove": "删除",
    "Weather": "天气",
    "Hottest day": "最热日",
    "Stock for hot-weather purchases": "为炎热天气采购备货",
    "Higher basket size on hot days": "热天客单价更高",
    "The forecast shows a high near": "预报显示最高温接近",
    "this week": "本周",
    "Stock cold drinks, quick lunch items and extra ice; pre-chill before afternoon traffic.": "备足冷饮、快速午餐和额外冰块；下午客流前提前冷藏。",
    "Check cold storage": "检查冷藏",
    "Place impulse items": "摆放冲动购买商品",
    "Prep staff talking points": "准备员工推荐话术",
    "Review HVAC load": "检查空调负荷",
    "High / low": "最高 / 最低",
    "Rain": "降雨",
    "Wind": "风",
    "Forecast": "预报",
    "Restaurant": "餐厅",
    "Retail": "零售",
    "Grocery": "杂货店",
    "Food stall": "餐饮摊位",
    "Coffee shop": "咖啡店",
    "Pharmacy": "药店",
    "Laundromat": "洗衣店",
    "Salon": "美发/美容店",
    "Barbershop": "理发店",
    "Daycare": "日托",
    "Auto repair": "汽车维修",
    "Location": "位置",
    "City": "城市",
    "Actions": "行动",
    "actions": "行动",
    "signals": "信号",
    "owner actions": "店主行动",
    "7 day forecast": "7天预报",
    "7 days": "7天",
    "city-wide": "全市",
    "scan around": "扫描范围在",
    "in Santa Clara": "在圣克拉拉",
    "Not set": "未设置",
    "Saved profile": "已保存资料",
    "Business name": "商家名称",
    "Business type": "商家类型",
    "Owner": "店主",
    "Legal structure": "法律结构",
    "Staff": "员工",
    "Revenue profile": "收入资料",
    "Inventory exposure": "库存风险",
    "Continuity": "连续运营",
    "Security": "安全",
    "Private operating notes": "私人运营笔记",
    "Search what the store needs to restock.": "搜索店铺需要补货的物品。",
    "Compare suppliers": "比较供应商",
    "Storefront": "供应商",
    "Top product": "热门产品",
    "Price and unit": "价格与单位",
    "Reviews / demand": "评价 / 需求",
    "Stock and timing": "库存与时间",
    "Owner action": "店主行动",
    "View / buy": "查看 / 购买"
  },
  vi: {
    "Stores": "Cửa hàng",
    "Store": "Cửa hàng",
    "Risk index": "Chỉ số rủi ro",
    "Opportunity index": "Chỉ số cơ hội",
    "Monitoring Area": "Khu vực theo dõi",
    "City Checks": "Kiểm tra thành phố",
    "Actionable Warnings": "Cảnh báo cần hành động",
    "Opportunity Plays": "Cơ hội hành động",
    "Weather Window": "Khung thời tiết",
    "City Signals": "Tín hiệu thành phố",
    "Owner decisions to review": "Quyết định chủ cần xem lại",
    "Profit, traffic or conversion plays": "Hành động tăng lợi nhuận, khách hoặc chuyển đổi",
    "Rain, heat, wind and staffing impact": "Tác động mưa, nóng, gió và nhân sự",
    "Concise owner cards below": "Thẻ ngắn gọn cho chủ ở dưới",
    "Computed from city after refresh": "Tính từ thành phố sau khi làm mới",
    "Weather, safety, access, permits, market": "Thời tiết, an toàn, lối vào, giấy phép, thị trường",
    "Waiting": "Đang chờ",
    "Updated now": "Vừa cập nhật",
    "Refreshing city checks": "Đang làm mới kiểm tra thành phố",
    "Looking for plain business actions: weather, safety, access, permits, nearby competition and demand changes.": "Đang tìm hành động kinh doanh rõ ràng: thời tiết, an toàn, lối vào, giấy phép, cạnh tranh gần đó và thay đổi nhu cầu.",
    "Possible permit or rule change to review": "Có thể cần xem lại giấy phép hoặc quy định",
    "California seller's permit": "Giấy phép bán hàng California",
    "Opportunities": "Cơ hội",
    "Warnings": "Cảnh báo",
    "Weather & Climate": "Thời tiết & khí hậu",
    "Store Notes": "Ghi chú cửa hàng",
    "Notes": "Ghi chú",
    "Restock": "Nhập hàng",
    "Added": "Đã thêm",
    "About": "Về",
    "saved for": "đã lưu cho",
    "Search stores, owners, cities": "Tìm cửa hàng, chủ, thành phố",
    "Search": "Tìm",
    "owners": "chủ",
    "cities": "thành phố",
    "Stored locally": "Lưu cục bộ",
    "Open supplier links to confirm live price and stock.": "Mở liên kết nhà cung cấp để xác nhận giá và tồn kho trực tiếp.",
    "WebstaurantStore is a strong compare point for delivery and pickup packaging": "WebstaurantStore là điểm so sánh tốt cho bao bì giao hàng và mang đi",
    "restaurant supply volume": "lượng vật tư nhà hàng",
    "bulk case": "thùng lớn",
    "count": "cái",
    "Compliance and Licensing": "Tuân thủ & giấy phép",
    "Crime and Safety": "Tội phạm & an toàn",
    "Infrastructure": "Hạ tầng",
    "Market and Competition": "Thị trường & cạnh tranh",
    "Media and Market": "Truyền thông & thị trường",
    "Regional Hazards": "Rủi ro khu vực",
    "Market positioning": "Định vị thị trường",
    "Check nearby competitors before choosing this week's offer": "Kiểm tra đối thủ gần đó trước khi chọn ưu đãi tuần này",
    "Better discovery and conversion": "Tăng hiển thị và chuyển đổi",
    "Why it matters:": "Vì sao quan trọng:",
    "Why it matters": "Vì sao quan trọng",
    "Do this:": "Làm việc này:",
    "Do this": "Làm việc này",
    "Customers may compare you with nearby places": "Khách có thể so sánh bạn với nơi gần đó",
    "Compare their hours, photos, menu/service clarity and prices. Choose one thing you can make clearer or better this week.": "So sánh giờ mở cửa, ảnh, độ rõ của menu/dịch vụ và giá. Chọn một điểm có thể làm rõ hoặc tốt hơn tuần này.",
    "Verify your hours": "Xác minh giờ mở cửa",
    "Update photos/menu": "Cập nhật ảnh/menu",
    "Compare one offer": "So sánh một ưu đãi",
    "Improve one listing": "Cải thiện một hồ sơ",
    "View evidence": "Xem bằng chứng",
    "Based on saved store profile": "Dựa trên hồ sơ đã lưu",
    "Add to notes": "Thêm vào ghi chú",
    "Remove": "Xóa",
    "Weather": "Thời tiết",
    "Hottest day": "Ngày nóng nhất",
    "Stock for hot-weather purchases": "Nhập hàng cho thời tiết nóng",
    "Higher basket size on hot days": "Giỏ hàng lớn hơn vào ngày nóng",
    "The forecast shows a high near": "Dự báo cho thấy nhiệt độ cao gần",
    "this week": "tuần này",
    "Stock cold drinks, quick lunch items and extra ice; pre-chill before afternoon traffic.": "Nhập đồ uống lạnh, món ăn nhanh và đá; làm lạnh trước giờ đông khách buổi chiều.",
    "Check cold storage": "Kiểm tra kho lạnh",
    "Place impulse items": "Đặt hàng mua nhanh",
    "Prep staff talking points": "Chuẩn bị lời giới thiệu cho nhân viên",
    "Review HVAC load": "Xem tải điều hòa",
    "High / low": "Cao / thấp",
    "Rain": "Mưa",
    "Wind": "Gió",
    "Forecast": "Dự báo",
    "Restaurant": "Nhà hàng",
    "Retail": "Bán lẻ",
    "Grocery": "Tạp hóa",
    "Food stall": "Quầy đồ ăn",
    "Coffee shop": "Quán cà phê",
    "Pharmacy": "Nhà thuốc",
    "Laundromat": "Tiệm giặt",
    "Salon": "Salon",
    "Barbershop": "Tiệm hớt tóc",
    "Daycare": "Nhà trẻ",
    "Auto repair": "Sửa xe",
    "Location": "Vị trí",
    "City": "Thành phố",
    "Actions": "Hành động",
    "actions": "hành động",
    "signals": "tín hiệu",
    "owner actions": "hành động của chủ",
    "7 day forecast": "dự báo 7 ngày",
    "7 days": "7 ngày",
    "city-wide": "toàn thành phố",
    "scan around": "quét quanh",
    "in Santa Clara": "ở Santa Clara",
    "Not set": "Chưa đặt",
    "Saved profile": "Hồ sơ đã lưu",
    "Business name": "Tên doanh nghiệp",
    "Business type": "Loại hình",
    "Owner": "Chủ",
    "Legal structure": "Cấu trúc pháp lý",
    "Staff": "Nhân sự",
    "Revenue profile": "Hồ sơ doanh thu",
    "Inventory exposure": "Rủi ro tồn kho",
    "Continuity": "Duy trì hoạt động",
    "Security": "An ninh",
    "Private operating notes": "Ghi chú vận hành riêng",
    "Search what the store needs to restock.": "Tìm món cửa hàng cần nhập lại.",
    "Compare suppliers": "So sánh nhà cung cấp",
    "Storefront": "Nhà cung cấp",
    "Top product": "Sản phẩm tốt nhất",
    "Price and unit": "Giá và đơn vị",
    "Reviews / demand": "Đánh giá / nhu cầu",
    "Stock and timing": "Tồn kho và thời gian",
    "Owner action": "Hành động của chủ",
    "View / buy": "Xem / mua"
  },
  fil: {
    "Stores": "Mga tindahan",
    "Store": "Tindahan",
    "Risk index": "Index ng panganib",
    "Opportunity index": "Index ng oportunidad",
    "Monitoring Area": "Lugar na minomonitor",
    "City Checks": "Pagsuri sa lungsod",
    "Actionable Warnings": "Mga babalang dapat aksyunan",
    "Opportunity Plays": "Mga oportunidad",
    "Weather Window": "Panahon",
    "City Signals": "Mga signal ng lungsod",
    "Owner decisions to review": "Mga desisyong rerepasuhin ng owner",
    "Profit, traffic or conversion plays": "Galaw para sa kita, customer traffic o conversion",
    "Rain, heat, wind and staffing impact": "Epekto ng ulan, init, hangin at staffing",
    "Concise owner cards below": "Maikling owner cards sa ibaba",
    "Computed from city after refresh": "Kinuwenta mula sa lungsod pagkatapos mag-refresh",
    "Weather, safety, access, permits, market": "Panahon, seguridad, access, permit, market",
    "Waiting": "Naghihintay",
    "Updated now": "Na-update ngayon",
    "Refreshing city checks": "Nire-refresh ang city checks",
    "Looking for plain business actions: weather, safety, access, permits, nearby competition and demand changes.": "Naghahanap ng malinaw na business actions: panahon, safety, access, permits, kalapit na competition at demand changes.",
    "Possible permit or rule change to review": "Posibleng permit o rule change na rerepasuhin",
    "California seller's permit": "California seller's permit",
    "Opportunities": "Oportunidad",
    "Warnings": "Babala",
    "Weather & Climate": "Panahon at klima",
    "Store Notes": "Store notes",
    "Notes": "Notes",
    "Restock": "Restock",
    "Added": "Idinagdag",
    "About": "Tungkol sa",
    "saved for": "naka-save para sa",
    "Search stores, owners, cities": "Hanapin ang store, owner, city",
    "Search": "Hanapin",
    "owners": "owners",
    "cities": "cities",
    "Stored locally": "Naka-save local",
    "Open supplier links to confirm live price and stock.": "Buksan ang supplier links para kumpirmahin ang live price at stock.",
    "WebstaurantStore is a strong compare point for delivery and pickup packaging": "Magandang comparison point ang WebstaurantStore para sa delivery at pickup packaging",
    "restaurant supply volume": "restaurant supply volume",
    "bulk case": "bulk case",
    "count": "count",
    "Compliance and Licensing": "Compliance at lisensya",
    "Crime and Safety": "Krimen at safety",
    "Infrastructure": "Infrastructure",
    "Market and Competition": "Market at competition",
    "Media and Market": "Media at market",
    "Regional Hazards": "Regional hazards",
    "Market positioning": "Market positioning",
    "Check nearby competitors before choosing this week's offer": "Suriin ang kalapit na competitors bago pumili ng offer ngayong linggo",
    "Better discovery and conversion": "Mas magandang visibility at conversion",
    "Why it matters:": "Bakit mahalaga:",
    "Why it matters": "Bakit mahalaga",
    "Do this:": "Gawin ito:",
    "Do this": "Gawin ito",
    "Customers may compare you with nearby places": "Maaaring ikumpara ka ng customers sa kalapit na negosyo",
    "Compare their hours, photos, menu/service clarity and prices. Choose one thing you can make clearer or better this week.": "Ikumpara ang oras, photos, linaw ng menu/serbisyo at presyo. Pumili ng isang bagay na pwedeng gawing mas malinaw o mas maganda ngayong linggo.",
    "Verify your hours": "I-verify ang oras",
    "Update photos/menu": "I-update ang photos/menu",
    "Compare one offer": "Ikumpara ang isang offer",
    "Improve one listing": "Ayusin ang isang listing",
    "View evidence": "Tingnan ang ebidensya",
    "Based on saved store profile": "Base sa naka-save na store profile",
    "Add to notes": "Idagdag sa notes",
    "Remove": "Alisin",
    "Weather": "Panahon",
    "Hottest day": "Pinakamainit na araw",
    "Stock for hot-weather purchases": "Mag-stock para sa mainit na panahon",
    "Higher basket size on hot days": "Mas malaking basket sa mainit na araw",
    "The forecast shows a high near": "Ayon sa forecast, mataas na temperatura malapit sa",
    "this week": "ngayong linggo",
    "Stock cold drinks, quick lunch items and extra ice; pre-chill before afternoon traffic.": "Mag-stock ng malamig na inumin, quick lunch items at extra ice; palamigin bago ang afternoon traffic.",
    "Check cold storage": "Suriin ang cold storage",
    "Place impulse items": "Ilagay ang impulse items",
    "Prep staff talking points": "Ihanda ang sasabihin ng staff",
    "Review HVAC load": "Suriin ang HVAC load",
    "High / low": "High / low",
    "Rain": "Ulan",
    "Wind": "Hangin",
    "Forecast": "Forecast",
    "Restaurant": "Restaurant",
    "Retail": "Retail",
    "Grocery": "Grocery",
    "Food stall": "Food stall",
    "Coffee shop": "Coffee shop",
    "Pharmacy": "Pharmacy",
    "Laundromat": "Laundromat",
    "Salon": "Salon",
    "Barbershop": "Barbershop",
    "Daycare": "Daycare",
    "Auto repair": "Auto repair",
    "Location": "Lokasyon",
    "City": "Lungsod",
    "Actions": "Aksyon",
    "actions": "aksyon",
    "signals": "signals",
    "owner actions": "owner actions",
    "7 day forecast": "7-araw na forecast",
    "7 days": "7 araw",
    "city-wide": "buong lungsod",
    "scan around": "scan sa paligid ng",
    "in Santa Clara": "sa Santa Clara",
    "Not set": "Hindi pa nakalagay",
    "Saved profile": "Naka-save na profile",
    "Business name": "Pangalan ng negosyo",
    "Business type": "Uri ng negosyo",
    "Owner": "May-ari",
    "Legal structure": "Legal structure",
    "Staff": "Staff",
    "Revenue profile": "Revenue profile",
    "Inventory exposure": "Inventory risk",
    "Continuity": "Continuity",
    "Security": "Security",
    "Private operating notes": "Private operating notes",
    "Search what the store needs to restock.": "Hanapin ang kailangang i-restock ng tindahan.",
    "Compare suppliers": "Ikumpara ang suppliers",
    "Storefront": "Supplier",
    "Top product": "Top product",
    "Price and unit": "Presyo at unit",
    "Reviews / demand": "Reviews / demand",
    "Stock and timing": "Stock at timing",
    "Owner action": "Aksyon ng owner",
    "View / buy": "Tingnan / bilhin"
  }
};

const PAGE_TRANSLATION_CARD_PHRASES = {
  es: {
    "Info": "Información",
    "Warning": "Alerta",
    "Opportunity": "Oportunidad",
    "Critical": "Crítico",
    "High": "Alto",
    "Medium": "Medio",
    "Low": "Bajo",
    "signal": "señal",
    "Weather and Climate": "Clima",
    "License checklist": "Lista de licencias",
    "Rule watch": "Vigilancia de reglas",
    "Law watch": "Vigilancia legal",
    "Compliance risk: check permits and required records": "Riesgo de cumplimiento: revise permisos y registros requeridos",
    "records to keep current": "registros que debe mantener al día",
    "Keep these records organized for inspections and renewals": "Mantenga estos registros organizados para inspecciones y renovaciones",
    "This is a checklist, not an urgent warning.": "Esto es una lista de control, no una alerta urgente.",
    "Business registration certificate": "Certificado de registro del negocio",
    "Fictitious business name filing": "Registro de nombre comercial ficticio",
    "Update permit dates, certificates, wage postings and inspection-readiness notes in the store profile.": "Actualice fechas de permisos, certificados, avisos salariales y notas de preparación para inspecciones en el perfil de la tienda.",
    "No new rule found": "No se encontró una regla nueva",
    "No obvious new local rule showed up. Keep permit dates and certificates current in your store profile.": "No apareció una regla local nueva evidente. Mantenga al día permisos y certificados en el perfil de la tienda.",
    "Local rule check": "Revisión de reglas locales",
    "Permit checklist": "Lista de permisos",
    "Local forecast": "Pronóstico local",
    "NWS alert": "Alerta meteorológica",
    "Weather alert": "Alerta del clima",
    "Weekly weather": "Clima semanal",
    "F right now": "°F ahora",
    "right now": "ahora",
    "7 day outlook": "panorama de 7 días",
    "rain chance": "probabilidad de lluvia",
    "% rain chance": "% de probabilidad de lluvia",
    "Next 7 days": "Próximos 7 días",
    "rain risk peaks": "pico de riesgo de lluvia",
    "Plan the week around a high near": "Planifique la semana con una máxima cerca de",
    "rain chance up to": "probabilidad de lluvia hasta",
    "and wind up to": "y viento hasta",
    "wind up to": "viento hasta",
    "Use this for staffing, outdoor setup, delivery messaging and perishable ordering.": "Úselo para personal, montaje exterior, mensajes de entrega y pedidos perecederos.",
    "Air quality": "Calidad del aire",
    "AQI": "ICA",
    "Current": "Actual",
    "Outdoor traffic should not be limited by air quality right now. Patio, sidewalk signage and walk-up demand can stay in the normal plan.": "La calidad del aire no debería limitar el tráfico exterior ahora. Patio, señalización exterior y demanda de clientes espontáneos pueden seguir el plan normal.",
    "Air quality may reduce outdoor traffic. Consider delivery messaging, staff exposure planning and limiting outdoor setup.": "La calidad del aire puede reducir el tráfico exterior. Considere mensajes de entrega, exposición del personal y limitar el montaje exterior.",
    "Safety watch": "Vigilancia de seguridad",
    "Safety risk: review store closing routine": "Riesgo de seguridad: revise la rutina de cierre",
    "Santa Clara safety item: check closing-route impact": "Tema de seguridad de Santa Clara: revise impacto en la ruta de cierre",
    "Review closing, lighting, cameras, cash handling and staff walkout timing for the next shift.": "Revise cierre, iluminación, cámaras, manejo de efectivo y salida del personal para el próximo turno.",
    "If the evidence location is nearby, tighten lighting, camera checks, cash handling and staff walkout procedure for the next shift.": "Si la ubicación de la evidencia está cerca, refuerce iluminación, cámaras, manejo de efectivo y salida del personal para el próximo turno.",
    "Check incident area": "Revise el área del incidente",
    "Compare store hours": "Compare horarios de la tienda",
    "Review closing": "Revise cierre",
    "Check lighting": "Revise iluminación",
    "Check cameras": "Revise cámaras",
    "Reduce cash exposure": "Reduzca exposición de efectivo",
    "Set walkout plan": "Defina plan de salida",
    "City infrastructure coverage": "Cobertura de infraestructura urbana",
    "City incident reports": "Reportes de incidentes de la ciudad",
    "recent reports": "reportes recientes",
    "Review this item before changing staffing, inventory, safety, access or permits.": "Revise esto antes de cambiar personal, inventario, seguridad, acceso o permisos.",
    "When:": "Cuándo:",
    "Area:": "Área:",
    "Store profile": "Perfil de tienda",
    "Based on store profile": "Basado en el perfil de tienda",
    "No notes saved for this store yet. Use Add to notes on any warning, weather, opportunity, or metric card.": "Aún no hay notas para esta tienda. Use Agregar a notas en cualquier alerta, clima, oportunidad o métrica."
  },
  zh: {
    "Info": "信息",
    "Warning": "警告",
    "Opportunity": "机会",
    "Critical": "严重",
    "High": "高",
    "Medium": "中等",
    "Low": "低",
    "signal": "信号",
    "Weather and Climate": "天气与气候",
    "License checklist": "许可证清单",
    "Rule watch": "规则监测",
    "Law watch": "法规监测",
    "Compliance risk: check permits and required records": "合规风险：检查许可证和必需记录",
    "records to keep current": "需要保持更新的记录",
    "Keep these records organized for inspections and renewals": "请整理这些记录以备检查和续期",
    "This is a checklist, not an urgent warning.": "这是检查清单，不是紧急警告。",
    "Business registration certificate": "商业登记证",
    "California seller's permit": "加州销售许可证",
    "Fictitious business name filing": "虚拟商号备案",
    "Update permit dates, certificates, wage postings and inspection-readiness notes in the store profile.": "请在店铺资料中更新许可证日期、证书、工资公告和检查准备笔记。",
    "permit dates": "许可证日期",
    "certificates": "证书",
    "wage postings": "工资公告",
    "inspection-readiness notes": "检查准备笔记",
    "required records": "必需记录",
    "store profile": "店铺资料",
    "No new rule found": "未发现新规则",
    "No obvious new local rule showed up. Keep permit dates and certificates current in your store profile.": "未发现明显的新本地规则。请在店铺资料中保持许可证日期和证书为最新。",
    "Local rule check": "本地规则检查",
    "Permit checklist": "许可证清单",
    "Local forecast": "本地预报",
    "NWS alert": "国家气象局警报",
    "Weather alert": "天气警报",
    "Weekly weather": "每周天气",
    "F right now": "°F 当前",
    "right now": "当前",
    "7 day outlook": "7 天展望",
    "rain chance": "降雨概率",
    "% rain chance": "% 降雨概率",
    "Next 7 days": "未来 7 天",
    "rain risk peaks": "降雨风险高峰",
    "Plan the week around a high near": "本周按最高温接近",
    "rain chance up to": "降雨概率最高",
    "and wind up to": "风速最高",
    "wind up to": "风速最高",
    "Use this for staffing, outdoor setup, delivery messaging and perishable ordering.": "请用它安排人员、户外布置、配送通知和易腐品订货。",
    "Air quality": "空气质量",
    "AQI": "空气质量指数",
    "Current": "当前",
    "Outdoor traffic should not be limited by air quality right now. Patio, sidewalk signage and walk-up demand can stay in the normal plan.": "当前空气质量不应限制户外客流。露台、人行道标识和到店需求可按正常计划执行。",
    "Air quality may reduce outdoor traffic. Consider delivery messaging, staff exposure planning and limiting outdoor setup.": "空气质量可能降低户外客流。请考虑配送通知、员工暴露防护，并限制户外布置。",
    "Outdoor traffic": "户外客流",
    "outdoor traffic": "户外客流",
    "Patio": "露台",
    "sidewalk signage": "人行道标识",
    "walk-up demand": "到店需求",
    "normal plan": "正常计划",
    "Safety watch": "安全监测",
    "Safety risk: review store closing routine": "安全风险：检查店铺打烊流程",
    "Santa Clara safety item: check closing-route impact": "圣克拉拉安全事项：检查打烊路线影响",
    "Review closing, lighting, cameras, cash handling and staff walkout timing for the next shift.": "请在下一班次前检查打烊、照明、摄像头、现金处理和员工离店时间。",
    "If the evidence location is nearby, tighten lighting, camera checks, cash handling and staff walkout procedure for the next shift.": "如果证据地点在附近，请在下一班次前加强照明、摄像头检查、现金处理和员工离店流程。",
    "closing routine": "打烊流程",
    "closing-route impact": "打烊路线影响",
    "closing": "打烊",
    "lighting": "照明",
    "cameras": "摄像头",
    "cash handling": "现金处理",
    "staff walkout timing": "员工离店时间",
    "staff walkout procedure": "员工离店流程",
    "next shift": "下一班次",
    "evidence location": "证据地点",
    "nearby": "附近",
    "tighten": "加强",
    "Check incident area": "检查事件区域",
    "Compare store hours": "对比店铺营业时间",
    "Review closing": "检查打烊流程",
    "Check lighting": "检查照明",
    "Check cameras": "检查摄像头",
    "Reduce cash exposure": "减少现金暴露",
    "Set walkout plan": "制定员工离店计划",
    "City infrastructure coverage": "城市基础设施覆盖",
    "City incident reports": "城市事件报告",
    "recent reports": "近期报告",
    "Recent nearby reports were mostly": "附近近期报告主要是",
    "Closest report was about": "最近的报告距离约",
    "away near": "，位置在",
    "Review closing, lighting and cash-handling if this overlaps your store hours.": "如果这与营业时间重叠，请检查打烊、照明和现金处理。",
    "Review this item before changing staffing, inventory, safety, access or permits.": "在调整人员、库存、安全、通行或许可证前，请先审查此事项。",
    "When:": "时间：",
    "Area:": "区域：",
    "Store profile": "店铺资料",
    "Based on store profile": "基于店铺资料",
    "Based on saved store profile": "基于已保存的店铺资料",
    "No notes saved for this store yet. Use Add to notes on any warning, weather, opportunity, or metric card.": "此店铺还没有保存笔记。可在任何警告、天气、机会或指标卡片上点击添加到笔记。",
    "No source checks yet.": "尚无来源检查。",
    "Active": "可用",
    "Unavailable this refresh": "本次刷新不可用",
    "Local safety news": "本地安全新闻",
    "Local business news": "本地商业新闻",
    "Local city news": "本地城市新闻",
    "Open-Meteo Air Quality": "Open-Meteo 空气质量",
    "National Weather Service": "国家气象局",
    "Medium /": "中等 /",
    "High /": "高 /",
    "Low /": "低 /",
    "owner review": "店主审查",
    "review": "审查",
    "Compliance": "合规",
    "Event watch": "活动监测",
    "Clean air window: keep outdoor and walk-up plan active": "空气良好窗口：保持户外和到店计划",
    "Clean air window: keep outdoor and walk-up plan available": "空气良好窗口：保持户外和到店计划",
    "Weather-driven demand planning": "按天气规划需求",
    "Event traffic: prepare inventory, staffing and offer": "活动客流：准备库存、人员和优惠",
    "Event traffic: prepare inventory and staffing": "活动客流：准备库存和人员",
    "Potential short-window traffic lift": "短时间客流提升机会",
    "Profit play from city trend": "城市趋势带来的盈利机会",
    "Sales, pricing or visibility decision": "销售、定价或曝光决策",
    "Avoid fines and prevent disruption": "避免罚款并防止运营中断",
    "Owner decision": "店主决策",
    "Prepare permit and inspection records": "准备许可证和检查记录",
    "Avoid fines, closures and delayed permits": "避免罚款、停业和许可证延误",
    "A local rule or permit item may affect this store.": "本地规则或许可证事项可能影响这家店。",
    "Check whether the rule or permit item applies, then update permit dates, certificates and store notes.": "确认该规则或许可证事项是否适用，然后更新许可证日期、证书和店铺笔记。",
    "Check applicability": "检查是否适用",
    "Update permit dates": "更新许可证日期",
    "Check certificates": "检查证书",
    "Save notes": "保存笔记",
    "Save note": "保存笔记",
    "Check permits": "检查许可证",
    "Check postings": "检查公告",
    "Update records": "更新记录",
    "Assign owner": "指定负责人",
    "Match the menu, prep and staffing to the forecast window; push pickup/delivery if walk-ins may slow.": "让菜单、备餐和人员安排匹配预报窗口；如果到店客流可能放缓，就推广自取/配送。",
    "Match the menu highlight to the weather, adjust prep, and push pickup/delivery if walk-ins may slow.": "根据天气突出一个菜单重点，调整备餐；如果到店客流可能放缓，就推广自取/配送。",
    "Use the forecast to adjust staffing, signage, inventory placement and pickup messaging.": "用天气预报调整人员、标识、库存摆放和自取通知。",
    "Pick forecast window": "选择预报窗口",
    "Tune staffing": "调整人员安排",
    "Adjust offer": "调整优惠",
    "Watch waste": "关注浪费",
    "Highlight right item": "突出合适商品",
    "Tune prep": "调整备餐",
    "Push delivery": "推广配送",
    "Confirm timing and distance, then add inventory, staff coverage and one short-window offer.": "确认时间和距离后，增加库存、人员覆盖和一个短期优惠。",
    "Check timing": "检查时间",
    "Check distance": "检查距离",
    "Stock top sellers": "备足畅销品",
    "Track redemptions": "追踪兑换",
    "Convert the signal into one measurable decision: offer, pricing, hours, staffing, listing, signage or stock.": "把这个信号转成一个可衡量决策：优惠、定价、营业时间、人员、商家页面、标识或库存。",
    "Check audience": "检查受众",
    "Choose one offer": "选择一个优惠",
    "Update listing/signage": "更新商家页面/标识",
    "Track result": "追踪结果",
    "Use the signal to reduce risk: update records, due dates and inspection readiness before it becomes urgent.": "用这个信号降低风险：在问题变急前更新记录、截止日期和检查准备状态。",
    "Pick one owner action for this week and track whether it changes sales, traffic, margin or risk.": "本周选择一个店主行动，并追踪它是否改变销售、客流、利润率或风险。",
    "Check fit": "检查是否匹配",
    "Choose action": "选择行动",
    "No major event spike found": "未发现明显活动客流高峰",
    "No obvious event-driven customer spike showed up. Keep normal staffing unless you already know of a local school, sports or neighborhood event.": "未发现明显由活动带来的顾客高峰。除非你已知道附近有学校、体育或社区活动，否则保持正常人员安排。",
    "No urgent issue found right now": "目前未发现紧急问题",
    "Use the weekly forecast and opportunity cards for planning; refresh before major orders or staffing changes.": "使用每周天气和机会卡片做计划；在大额订货或调整人员前刷新。",
    "Review weather before ordering perishables": "订购易腐品前查看天气",
    "Check license checklist monthly": "每月检查许可证清单",
    "Confirm store records are complete": "确认店铺记录完整",
    "A local safety incident can affect customer confidence, staff comfort and closing procedures.": "本地安全事件可能影响顾客信心、员工安心感和打烊流程。",
    "A permit, wage, tax or inspection item can affect store records, renewal timing or required postings.": "许可证、工资、税务或检查事项可能影响店铺记录、续期时间或必需公告。",
    "Regional fire or smoke event to watch": "需关注的区域火灾或烟雾事件",
    "Regional storm event to watch": "需关注的区域风暴事件",
    "Regional natural event to watch": "需关注的区域自然事件",
    "A regional natural event may affect air quality, supply routing or customer traffic if it moves toward the city. Watch the forecast before changing operations.": "如果区域自然事件靠近城市，可能影响空气质量、供应路线或顾客客流。调整运营前先关注预报。",
    "Check air quality, outdoor setup, staff exposure and delivery route reliability before the next busy period.": "下一个繁忙时段前，检查空气质量、户外布置、员工暴露风险和配送路线可靠性。",
    "Limit outdoor setup": "限制户外布置",
    "Check supply routes": "检查供应路线",
    "Message customers": "通知顾客",
    "staff exposure": "员工暴露风险",
    "supply routing": "供应路线",
    "delivery route reliability": "配送路线可靠性",
    "busy period": "繁忙时段",
    "air quality": "空气质量",
    "such as": "例如",
    "customers have comparable dining choices nearby.": "附近顾客有类似餐饮选择。",
    "Profit angle for this restaurant:": "此餐厅的盈利角度：",
    "make one menu item, price point or combo easier to choose than competitors.": "让一个菜品、价格点或套餐比竞争对手更容易被选择。",
    "Compare nearby menus/photos, then promote one high-margin item or combo with clear pricing.": "比较附近菜单/照片，然后推广一个高利润商品或价格清晰的套餐。",
    "Compare menus": "比较菜单",
    "Feature high-margin item": "突出高利润商品",
    "Update photos": "更新照片",
    "Build event combo": "设计活动套餐",
    "Prep top sellers": "准备畅销品",
    "Staff rush window": "安排高峰时段人员",
    "Promote pickup": "推广自取",
    "City trend: event crowds can lift food sales": "城市趋势：活动人流可提升餐饮销售",
    "City trend: campus demand can grow meal traffic": "城市趋势：校园需求可增加餐饮客流",
    "City trend: dining competition can lift better offers": "城市趋势：餐饮竞争可推动更好优惠",
    "City trend: weather can shift food orders": "城市趋势：天气会改变餐饮订单",
    "Trending in": "趋势：",
    "Trending in Santa Clara:": "圣克拉拉趋势：",
    "Trending in San Francisco:": "旧金山趋势：",
    "events can create fast meal and snack demand.": "活动会带来快速餐食和小吃需求。",
    "student or campus activity can change lunch, dinner and late-snack demand.": "学生或校园活动会改变午餐、晚餐和夜宵需求。",
    "heat, rain or air quality can change dine-in, patio and delivery behavior.": "高温、降雨或空气质量会改变堂食、露台和配送行为。",
    "sell a limited combo that is quick to prep and easy to order.": "销售一个准备快、下单简单的限时套餐。",
    "target the right time window with a student-friendly item.": "用适合学生的商品瞄准正确时间窗口。",
    "push cold items, comfort food or delivery depending on the forecast.": "根据预报推广冷饮、舒适餐食或配送。",
    "Create a student meal deal, post it near campus channels, and stock the fastest-selling items for the peak window.": "创建学生餐优惠，在校园渠道附近发布，并为高峰窗口备足最快销商品。",
    "Create student deal": "创建学生优惠",
    "Stock fast sellers": "备足快销品",
    "Post near campus": "在校园附近发布",
    "Launch one event combo, prep top sellers, staff the rush window and promote pickup/delivery before the event starts.": "推出一个活动套餐，准备畅销品，安排高峰人员，并在活动开始前推广自取/配送。",
    "Compare their hours, photos": "比较他们的营业时间、照片",
    "Check AQI": "检查空气质量指数",
    "City map": "城市地图",
    "and bulk case": "和批发箱",
    "Overcast": "阴天",
    "Drizzle": "小雨",
    "Clear": "晴朗",
    "Mostly clear": "大致晴朗",
    "Cloudy": "多云",
    "Mon, May": "周一，5月",
    "Tue, May": "周二，5月",
    "Wed, May": "周三，5月",
    "Thu, May": "周四，5月",
    "Fri, May": "周五，5月",
    "Sat, May": "周六，5月",
    "Sun, May": "周日，5月",
    "mi scan around": "英里扫描范围："
  },
  vi: {
    "Info": "Thông tin",
    "Warning": "Cảnh báo",
    "Opportunity": "Cơ hội",
    "Critical": "Nghiêm trọng",
    "High": "Cao",
    "Medium": "Trung bình",
    "Low": "Thấp",
    "signal": "tín hiệu",
    "Weather and Climate": "Thời tiết & khí hậu",
    "License checklist": "Danh sách giấy phép",
    "Rule watch": "Theo dõi quy định",
    "Law watch": "Theo dõi luật",
    "Compliance risk: check permits and required records": "Rủi ro tuân thủ: kiểm tra giấy phép và hồ sơ bắt buộc",
    "records to keep current": "hồ sơ cần cập nhật",
    "Keep these records organized for inspections and renewals": "Sắp xếp các hồ sơ này để sẵn sàng kiểm tra và gia hạn",
    "This is a checklist, not an urgent warning.": "Đây là danh sách kiểm tra, không phải cảnh báo khẩn cấp.",
    "Business registration certificate": "Giấy chứng nhận đăng ký kinh doanh",
    "Fictitious business name filing": "Hồ sơ tên thương mại",
    "Update permit dates, certificates, wage postings and inspection-readiness notes in the store profile.": "Cập nhật ngày giấy phép, chứng chỉ, thông báo lương và ghi chú sẵn sàng kiểm tra trong hồ sơ cửa hàng.",
    "No new rule found": "Chưa thấy quy định mới",
    "No obvious new local rule showed up. Keep permit dates and certificates current in your store profile.": "Chưa thấy quy định địa phương mới rõ ràng. Hãy cập nhật ngày giấy phép và chứng chỉ trong hồ sơ cửa hàng.",
    "Local rule check": "Kiểm tra quy định địa phương",
    "Permit checklist": "Danh sách giấy phép",
    "Local forecast": "Dự báo địa phương",
    "NWS alert": "Cảnh báo thời tiết quốc gia",
    "Weather alert": "Cảnh báo thời tiết",
    "Weekly weather": "Thời tiết tuần",
    "F right now": "°F hiện tại",
    "right now": "hiện tại",
    "7 day outlook": "triển vọng 7 ngày",
    "rain chance": "khả năng mưa",
    "% rain chance": "% khả năng mưa",
    "Next 7 days": "7 ngày tới",
    "rain risk peaks": "đỉnh rủi ro mưa",
    "Plan the week around a high near": "Lên kế hoạch tuần quanh mức cao gần",
    "rain chance up to": "khả năng mưa tới",
    "and wind up to": "và gió tới",
    "wind up to": "gió tới",
    "Use this for staffing, outdoor setup, delivery messaging and perishable ordering.": "Dùng thông tin này để xếp nhân sự, bố trí ngoài trời, thông báo giao hàng và đặt hàng dễ hỏng.",
    "Air quality": "Chất lượng không khí",
    "AQI": "AQI",
    "Current": "Hiện tại",
    "Outdoor traffic should not be limited by air quality right now. Patio, sidewalk signage and walk-up demand can stay in the normal plan.": "Hiện chất lượng không khí không nên hạn chế khách ngoài trời. Sân ngoài, biển vỉa hè và khách ghé trực tiếp có thể giữ kế hoạch bình thường.",
    "Air quality may reduce outdoor traffic. Consider delivery messaging, staff exposure planning and limiting outdoor setup.": "Chất lượng không khí có thể giảm khách ngoài trời. Cân nhắc thông báo giao hàng, bảo vệ nhân viên và hạn chế bố trí ngoài trời.",
    "Safety watch": "Theo dõi an toàn",
    "Safety risk: review store closing routine": "Rủi ro an toàn: xem lại quy trình đóng cửa",
    "Santa Clara safety item: check closing-route impact": "Mục an toàn Santa Clara: kiểm tra ảnh hưởng tuyến đóng cửa",
    "Review closing, lighting, cameras, cash handling and staff walkout timing for the next shift.": "Xem lại đóng cửa, ánh sáng, camera, xử lý tiền mặt và thời điểm nhân viên ra về cho ca tiếp theo.",
    "If the evidence location is nearby, tighten lighting, camera checks, cash handling and staff walkout procedure for the next shift.": "Nếu vị trí bằng chứng ở gần, tăng kiểm tra ánh sáng, camera, tiền mặt và quy trình nhân viên ra về cho ca tiếp theo.",
    "Check incident area": "Kiểm tra khu vực sự việc",
    "Compare store hours": "So sánh giờ cửa hàng",
    "Review closing": "Xem lại đóng cửa",
    "Check lighting": "Kiểm tra ánh sáng",
    "Check cameras": "Kiểm tra camera",
    "Reduce cash exposure": "Giảm rủi ro tiền mặt",
    "Set walkout plan": "Lập kế hoạch ra về",
    "City infrastructure coverage": "Mức phủ hạ tầng thành phố",
    "City incident reports": "Báo cáo sự cố thành phố",
    "recent reports": "báo cáo gần đây",
    "Review this item before changing staffing, inventory, safety, access or permits.": "Xem mục này trước khi đổi nhân sự, tồn kho, an toàn, lối vào hoặc giấy phép.",
    "When:": "Khi:",
    "Area:": "Khu vực:",
    "Store profile": "Hồ sơ cửa hàng",
    "Based on store profile": "Dựa trên hồ sơ cửa hàng",
    "No notes saved for this store yet. Use Add to notes on any warning, weather, opportunity, or metric card.": "Chưa có ghi chú cho cửa hàng này. Dùng Thêm vào ghi chú trên bất kỳ thẻ cảnh báo, thời tiết, cơ hội hoặc chỉ số nào."
  },
  fil: {
    "Info": "Impormasyon",
    "Warning": "Babala",
    "Opportunity": "Oportunidad",
    "Critical": "Kritikal",
    "High": "Mataas",
    "Medium": "Katamtaman",
    "Low": "Mababa",
    "signal": "signal",
    "Weather and Climate": "Panahon at klima",
    "License checklist": "Checklist ng lisensya",
    "Rule watch": "Bantay-regulasyon",
    "Law watch": "Bantay-batas",
    "Compliance risk: check permits and required records": "Compliance risk: suriin ang permits at kailangang records",
    "records to keep current": "records na dapat updated",
    "Keep these records organized for inspections and renewals": "Ayusin ang records na ito para sa inspections at renewals",
    "This is a checklist, not an urgent warning.": "Checklist ito, hindi urgent na babala.",
    "Business registration certificate": "Business registration certificate",
    "Fictitious business name filing": "Fictitious business name filing",
    "Update permit dates, certificates, wage postings and inspection-readiness notes in the store profile.": "I-update ang permit dates, certificates, wage postings at inspection notes sa store profile.",
    "No new rule found": "Walang bagong rule na nakita",
    "No obvious new local rule showed up. Keep permit dates and certificates current in your store profile.": "Walang malinaw na bagong local rule. Panatilihing updated ang permit dates at certificates sa store profile.",
    "Local rule check": "Local rule check",
    "Permit checklist": "Permit checklist",
    "Local forecast": "Local forecast",
    "NWS alert": "Weather alert",
    "Weather alert": "Weather alert",
    "Weekly weather": "Lingguhang panahon",
    "F right now": "°F ngayon",
    "right now": "ngayon",
    "7 day outlook": "7-araw na outlook",
    "rain chance": "chance ng ulan",
    "% rain chance": "% chance ng ulan",
    "Next 7 days": "Susunod na 7 araw",
    "rain risk peaks": "pinakamataas ang risk ng ulan",
    "Plan the week around a high near": "Planuhin ang linggo sa high na malapit sa",
    "rain chance up to": "chance ng ulan hanggang",
    "and wind up to": "at hangin hanggang",
    "wind up to": "hangin hanggang",
    "Use this for staffing, outdoor setup, delivery messaging and perishable ordering.": "Gamitin ito para sa staffing, outdoor setup, delivery messages at perishable orders.",
    "Air quality": "Air quality",
    "AQI": "AQI",
    "Current": "Kasalukuyan",
    "Outdoor traffic should not be limited by air quality right now. Patio, sidewalk signage and walk-up demand can stay in the normal plan.": "Hindi dapat hadlangan ng air quality ang outdoor traffic ngayon. Patio, sidewalk signage at walk-up demand ay maaaring manatili sa normal plan.",
    "Air quality may reduce outdoor traffic. Consider delivery messaging, staff exposure planning and limiting outdoor setup.": "Maaaring bawasan ng air quality ang outdoor traffic. Isaalang-alang ang delivery messages, staff exposure plan at limitadong outdoor setup.",
    "Safety watch": "Safety watch",
    "Safety risk: review store closing routine": "Safety risk: suriin ang closing routine ng store",
    "Santa Clara safety item: check closing-route impact": "Santa Clara safety item: suriin ang epekto sa closing route",
    "Review closing, lighting, cameras, cash handling and staff walkout timing for the next shift.": "Suriin ang closing, lighting, cameras, cash handling at staff walkout timing para sa susunod na shift.",
    "If the evidence location is nearby, tighten lighting, camera checks, cash handling and staff walkout procedure for the next shift.": "Kung malapit ang evidence location, higpitan ang lighting, camera checks, cash handling at staff walkout procedure para sa susunod na shift.",
    "Check incident area": "Suriin ang incident area",
    "Compare store hours": "Ikumpara ang store hours",
    "Review closing": "Suriin ang closing",
    "Check lighting": "Suriin ang lighting",
    "Check cameras": "Suriin ang cameras",
    "Reduce cash exposure": "Bawasan ang cash exposure",
    "Set walkout plan": "Gumawa ng walkout plan",
    "City infrastructure coverage": "City infrastructure coverage",
    "City incident reports": "City incident reports",
    "recent reports": "recent reports",
    "Review this item before changing staffing, inventory, safety, access or permits.": "Suriin muna ito bago baguhin ang staffing, inventory, safety, access o permits.",
    "When:": "Kailan:",
    "Area:": "Lugar:",
    "Store profile": "Store profile",
    "Based on store profile": "Base sa store profile",
    "No notes saved for this store yet. Use Add to notes on any warning, weather, opportunity, or metric card.": "Wala pang notes para sa store na ito. Gamitin ang Add to notes sa warning, weather, opportunity o metric card."
  }
};

Object.entries(PAGE_TRANSLATION_CARD_PHRASES).forEach(([lang, phrases]) => {
  PAGE_TRANSLATION_PHRASES[lang] = { ...(PAGE_TRANSLATION_PHRASES[lang] || {}), ...phrases };
});

const originalTextNodes = new WeakMap();
const originalAttributeValues = new WeakMap();
let translationFrame = 0;

const state = {
  stores: loadStores(),
  selectedId: localStorage.getItem("warden:selectedStore") || "sf-demo",
  language: localStorage.getItem("warden:language") || "en",
  latestIntel: null,
  activeSignalFilter: "all",
  modalMode: "add",
  modalSelectedType: "restaurant",
  reviewItems: loadReviewItems(),
  chatThreads: loadChatThreads(),
  chatOpen: false,
  restockResults: null,
  restockLoading: false,
  cardCache: new Map(),
  cardSeq: 0
};

const ids = [
  "healthCount", "opportunityCount", "warningCount", "reviewCount", "storeNotesCount", "sourcesTopBtn", "opportunitiesTopBtn", "warningsTopBtn", "reviewTopBtn", "storeNotesBtn", "restockTopBtn", "refreshTopBtn", "pdfBtn", "emailBtn", "translateLabel", "languageSelect",
  "storeCount", "storeSearch", "storesList", "addStoreBtn", "detailsStoreBtn", "editStoreBtn",
  "riskScore", "riskBar", "opportunityScore", "opportunityBar",
  "metricsGrid", "addressPill", "cityPill", "updatedText", "bannerStack", "subTabs",
  "storeInfoSection", "storeInfoMeta", "storeInfoPanel", "restockSection", "restockMeta", "restockForm", "restockQuery", "restockSuggestions", "restockResults", "opportunitiesSection", "opportunitiesMeta", "opportunitiesPanel", "warningsSection", "warningsMeta", "warningsPanel", "weatherSection", "weatherPanel",
  "reviewLaterSection", "reviewLaterMeta", "reviewLaterList", "signalsRoot", "checksModal", "sourceHealthList", "closeChecksModalBtn",
  "storeModal", "modalKicker", "modalTitle", "modalName", "modalTypeSearch", "modalTypeGrid", "modalAddress", "modalAddress2", "modalCity", "modalState", "modalZip",
  "modalOwner", "modalOwnerPhone", "modalOwnerEmail", "modalLegalStructure", "modalFounded", "modalFullTimeStaff", "modalPartTimeStaff", "modalAvgTicket",
  "modalDailyRevenue", "modalInventoryValue", "modalSuppliers", "modalBackupPower", "modalSecuritySystem", "modalInsuranceCarrier", "modalLanguages",
  "modalLicenseNotes", "modalDocumentNotes", "modalStoreNotes", "closeStoreModalBtn", "saveStoreModalBtn",
  "detailsModal", "detailsTitle", "detailsGrid", "closeDetailsModalBtn", "detailsEditBtn",
  "chatFab", "chatPanel", "chatCloseBtn", "chatContext", "chatMessages", "chatSuggestions", "chatForm", "chatInput", "chatSendBtn"
];
const els = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

boot();

function boot() {
  if (!selectedStore()) {
    state.selectedId = state.stores[0]?.id || "sf-demo";
  }
  renderStores();
  renderDashboard();
  renderReviewLater();
  renderChat();
  wireEvents();
  renderLanguageChrome();
  refreshIntel();
}

function wireEvents() {
  els.storeSearch.addEventListener("input", renderStores);
  els.addStoreBtn.addEventListener("click", () => openStoreModal("add"));
  els.editStoreBtn.addEventListener("click", () => openStoreModal("edit"));
  els.detailsStoreBtn.addEventListener("click", openStoreInfoView);
  els.refreshTopBtn.addEventListener("click", refreshIntel);
  els.pdfBtn.addEventListener("click", exportPdfReport);
  els.emailBtn.addEventListener("click", emailReport);
  els.sourcesTopBtn.addEventListener("click", openChecksModal);
  els.opportunitiesTopBtn.addEventListener("click", () => setSignalFilter("Opportunities"));
  els.warningsTopBtn.addEventListener("click", () => setSignalFilter("Warnings"));
  els.reviewTopBtn.addEventListener("click", openStoreNotesView);
  els.storeNotesBtn.addEventListener("click", openStoreNotesView);
  els.restockTopBtn.addEventListener("click", openRestockView);
  els.restockForm.addEventListener("submit", handleRestockSubmit);
  els.languageSelect.addEventListener("change", handleLanguageChange);
  els.chatFab.addEventListener("click", openChat);
  els.chatCloseBtn.addEventListener("click", closeChat);
  els.chatForm.addEventListener("submit", handleChatSubmit);
  els.chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      els.chatForm.requestSubmit();
    }
  });
  document.addEventListener("click", handleReviewClick);
  els.modalTypeSearch.addEventListener("input", renderModalTypeGrid);
  els.closeStoreModalBtn.addEventListener("click", closeStoreModal);
  els.saveStoreModalBtn.addEventListener("click", saveStoreFromModal);
  els.storeModal.addEventListener("click", (event) => {
    if (event.target === els.storeModal) closeStoreModal();
  });
  els.closeChecksModalBtn.addEventListener("click", closeChecksModal);
  els.checksModal.addEventListener("click", (event) => {
    if (event.target === els.checksModal) closeChecksModal();
  });
  els.closeDetailsModalBtn.addEventListener("click", closeDetailsModal);
  els.detailsEditBtn.addEventListener("click", () => {
    closeDetailsModal();
    openStoreModal("edit");
  });
  els.detailsModal.addEventListener("click", (event) => {
    if (event.target === els.detailsModal) closeDetailsModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeStoreModal();
      closeDetailsModal();
      closeChecksModal();
      closeChat();
    }
  });
}

function handleLanguageChange(event) {
  state.language = TRANSLATIONS[event.target.value] ? event.target.value : "en";
  localStorage.setItem("warden:language", state.language);
  renderLanguageChrome();
  renderFilters(state.latestIntel?.groups || []);
  renderRestock();
  renderChat();
  queuePageTranslation();
}

function renderLanguageChrome() {
  state.language = TRANSLATIONS[state.language] ? state.language : "en";
  document.documentElement.lang = LANGUAGE_META[state.language]?.html || "en";
  els.languageSelect.value = state.language;
  els.translateLabel.textContent = t("translate");

  const counts = {
    health: els.healthCount?.textContent || "0",
    opportunity: els.opportunityCount?.textContent || "0",
    warning: els.warningCount?.textContent || "0",
    review: els.reviewCount?.textContent || "0"
  };
  els.sourcesTopBtn.innerHTML = `<span class="btn-emoji">✓</span>${escapeHtml(t("checks"))} <span class="badge" id="healthCount">${escapeHtml(counts.health)}</span>`;
  els.opportunitiesTopBtn.innerHTML = `<span class="btn-emoji">💡</span>${escapeHtml(t("plays"))} <span class="badge" id="opportunityCount">${escapeHtml(counts.opportunity)}</span>`;
  els.warningsTopBtn.innerHTML = `<span class="btn-emoji">⚠️</span>${escapeHtml(t("alerts"))} <span class="badge" id="warningCount">${escapeHtml(counts.warning)}</span>`;
  els.reviewTopBtn.innerHTML = `<span class="btn-emoji">📝</span>${escapeHtml(t("notes"))} <span class="badge" id="reviewCount">${escapeHtml(counts.review)}</span>`;
  syncBadgeRefs();

  els.emailBtn.classList.add("icon-only");
  els.pdfBtn.classList.add("icon-only");
  els.emailBtn.innerHTML = `<span class="btn-emoji">✉️</span>`;
  els.pdfBtn.innerHTML = `<span class="btn-emoji">⬇️</span>`;
  els.emailBtn.setAttribute("aria-label", t("email"));
  els.pdfBtn.setAttribute("aria-label", t("pdf"));
  els.emailBtn.title = t("email");
  els.pdfBtn.title = t("pdf");
  els.restockTopBtn.innerHTML = `<span class="btn-emoji">📦</span>${escapeHtml(t("restock"))}`;
  setLoading(document.body.classList.contains("is-loading"));
  els.addStoreBtn.textContent = t("addStore");
  els.detailsStoreBtn.textContent = t("viewInfo");
  els.editStoreBtn.textContent = t("editStore");
  els.storeSearch.placeholder = t("searchStores");
  els.storeNotesBtn.childNodes[0].nodeValue = `${t("storeNotes")} `;
  els.restockQuery.placeholder = t("restockSearch");
  els.restockForm.querySelector("button[type='submit']").textContent = t("compareSuppliers");
  els.chatInput.placeholder = t("askStore");
  queuePageTranslation();
}

function syncBadgeRefs() {
  els.healthCount = document.getElementById("healthCount");
  els.opportunityCount = document.getElementById("opportunityCount");
  els.warningCount = document.getElementById("warningCount");
  els.reviewCount = document.getElementById("reviewCount");
}

function queuePageTranslation() {
  if (translationFrame) cancelAnimationFrame(translationFrame);
  translationFrame = requestAnimationFrame(() => {
    translationFrame = 0;
    translateRenderedPage();
  });
}

function translateRenderedPage() {
  const lang = TRANSLATIONS[state.language] ? state.language : "en";
  translateTextNodes(document.body, lang);
  translateElementAttributes(lang);
}

function translateTextNodes(root, lang) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE", "OPTION", "SELECT", "TEXTAREA"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest(".translate-control")) return NodeFilter.FILTER_REJECT;
      if (parent.closest(".store-name")) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.nodeValue);
    const original = originalTextNodes.get(node);
    node.nodeValue = lang === "en" ? original : translateCopy(original, lang);
  });
}

function translateElementAttributes(lang) {
  const attributes = ["placeholder", "aria-label", "title"];
  document.querySelectorAll("[placeholder], [aria-label], [title]").forEach((element) => {
    if (element.closest(".translate-control")) return;
    let map = originalAttributeValues.get(element);
    if (!map) {
      map = {};
      originalAttributeValues.set(element, map);
    }
    attributes.forEach((attr) => {
      if (!element.hasAttribute(attr)) return;
      if (!map[attr]) map[attr] = element.getAttribute(attr);
      element.setAttribute(attr, lang === "en" ? map[attr] : translateCopy(map[attr], lang));
    });
  });
}

function translateCopy(value, lang) {
  if (lang === "en") return value;
  const phrases = PAGE_TRANSLATION_PHRASES[lang] || {};
  const original = String(value ?? "");
  if (!original.trim()) return original;
  if (/^https?:\/\//i.test(original.trim()) || /^[\w.-]+@[\w.-]+\.\w+$/.test(original.trim())) return original;

  const leading = original.match(/^\s*/)?.[0] || "";
  const trailing = original.match(/\s*$/)?.[0] || "";
  let text = original.trim().replace(/\s+/g, " ");
  if (phrases[text]) return `${leading}${phrases[text]}${trailing}`;

  const sorted = Object.keys(phrases)
    .filter((phrase) => /[\s:;,.!?/&()%-]/.test(phrase))
    .sort((a, b) => b.length - a.length);
  for (const phrase of sorted) {
    text = text.replace(translationRegex(phrase), phrases[phrase]);
  }

  if (text === original.trim()) {
    text = text.replace(/[A-Za-z][A-Za-z'/-]*/g, (word) => phrases[word] || phrases[titleCase(word)] || word);
  }
  return `${leading}${text}${trailing}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function translationRegex(phrase) {
  const escaped = escapeRegExp(phrase);
  const start = /^[A-Za-z0-9]/.test(phrase) ? "\\b" : "";
  const end = /[A-Za-z0-9]$/.test(phrase) ? "\\b" : "";
  return new RegExp(`${start}${escaped}${end}`, "gi");
}

function renderStores() {
  const query = els.storeSearch.value.trim().toLowerCase();
  const stores = state.stores.filter((store) => storeSearchText(store).includes(query));
  els.storeCount.textContent = state.stores.length;
  els.storesList.innerHTML = stores.map((store) => `
    <button class="store-card ${store.id === state.selectedId ? "active" : ""}" data-id="${escapeAttr(store.id)}">
      <div class="avatar">${escapeHtml(initials(store.businessName))}</div>
      <div>
        <div class="store-name">${escapeHtml(store.businessName || "Unnamed storefront")}</div>
        <div class="store-meta">${escapeHtml([`${iconType(store.businessType)} ${store.city || "Unplaced"}`, labelType(store.businessType)].filter(Boolean).join(" · "))}</div>
        <div class="mini-bars">
          <div class="mini-bar"><span class="risk" style="width:${clampNumber(store.risk || 0, 0, 100)}%"></span></div>
          <div class="mini-bar"><span class="opp" style="width:${clampNumber(store.opportunity || 0, 0, 100)}%"></span></div>
        </div>
      </div>
    </button>
  `).join("") || `<div class="empty">No stores match this search.</div>`;

  els.storesList.querySelectorAll(".store-card").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedId = card.dataset.id;
      localStorage.setItem("warden:selectedStore", state.selectedId);
      state.latestIntel = null;
      state.activeSignalFilter = "all";
      state.restockResults = null;
      renderStores();
      renderDashboard();
      renderChat();
      refreshIntel();
    });
  });
  queuePageTranslation();
}

function renderDashboard() {
  const store = selectedStore();
  if (!store) return;
  els.riskScore.textContent = Number.isFinite(Number(store.risk)) && store.risk ? Math.round(store.risk) : "--";
  els.opportunityScore.textContent = Number.isFinite(Number(store.opportunity)) && store.opportunity ? Math.round(store.opportunity) : "--";
  els.riskBar.style.width = `${clampNumber(store.risk || 0, 0, 100)}%`;
  els.opportunityBar.style.width = `${clampNumber(store.opportunity || 0, 0, 100)}%`;
  renderMetrics(state.latestIntel?.metrics || fallbackMetrics(store));
  renderStoreInfo();
  renderRestock();
  renderReviewLater();
  renderChat();
  queuePageTranslation();
}

function renderMetrics(metrics) {
  els.metricsGrid.innerHTML = metrics.map((item) => `
    <article class="metric-card ${severityClass(item.tone)}">
      <div class="metric-head">
        <span class="metric-icon" aria-hidden="true">${escapeHtml(metricIcon(item.label, item.tone))}</span>
        <div class="metric-label">${escapeHtml(item.label)}</div>
      </div>
      <div class="metric-value">${escapeHtml(item.value)}</div>
      <div class="metric-detail">${escapeHtml(item.detail || "")}</div>
    </article>
  `).join("");
}

async function refreshIntel() {
  const store = selectedStore();
  if (!store) return;
  setLoading(true);
  renderBanners([{ level: "info", title: "Refreshing city checks", body: "Looking for plain business actions: weather, safety, access, permits, nearby competition and demand changes." }]);
  els.opportunitiesPanel.innerHTML = loadingCards(2);
  els.warningsPanel.innerHTML = loadingCards(2);
  els.weatherPanel.innerHTML = loadingCards(7);
  els.signalsRoot.innerHTML = `<div class="loading-stack">${loadingCards(4)}</div>`;
  queuePageTranslation();

  try {
    const response = await fetch(`/api/intel?${new URLSearchParams(profileParams(store))}`);
    if (!response.ok) throw new Error(`City check failed with status ${response.status}`);
    const intel = await response.json();
    state.latestIntel = intel;
    applyIntel(intel);
  } catch (error) {
    renderBanners([{ level: "critical", title: "City scan failed", body: error.message }]);
    els.opportunitiesPanel.innerHTML = `<div class="empty">The dashboard shell loaded, but the intelligence endpoint failed.</div>`;
    els.warningsPanel.innerHTML = "";
    els.weatherPanel.innerHTML = "";
    els.signalsRoot.innerHTML = "";
  } finally {
    setLoading(false);
  }
}

function profileParams(store) {
  const params = {
    businessName: store.businessName || "Unnamed storefront",
    businessType: normalizeType(store.businessType || "retail"),
    address: joinStoreAddress(store),
    city: store.city || inferCityFromAddress(joinStoreAddress(store)),
    state: normalizeState(store.state || "CA")
  };
  if (Number.isFinite(Number(store.lat)) && Number.isFinite(Number(store.lon))) {
    params.lat = String(store.lat);
    params.lon = String(store.lon);
  }
  return params;
}

function applyIntel(intel) {
  const store = selectedStore();
  const profile = intel.profile || {};
  resetCardCache();
  Object.assign(store, {
    businessName: profile.businessName || store.businessName,
    businessType: profile.businessType || store.businessType,
    city: profile.city || store.city,
    state: normalizeState(profile.state || store.state),
    lat: profile.lat,
    lon: profile.lon,
    radiusMeters: profile.radiusMeters || store.radiusMeters,
    cityScopeLabel: profile.cityScopeLabel || store.cityScopeLabel,
    cityScopeSource: profile.cityScopeSource || store.cityScopeSource,
    risk: Math.round(intel.scores?.risk || 0),
    opportunity: Math.round(intel.scores?.opportunity || 0)
  });

  els.healthCount.textContent = (intel.sourceHealth || []).filter((item) => item.ok).length;
  els.opportunityCount.textContent = (intel.opportunities || []).length;
  els.warningCount.textContent = (intel.warnings || []).filter((item) => item.urgency !== "Low").length;
  els.addressPill.textContent = shortAddress(store.address || profile.locationLabel || "Location");
  els.cityPill.textContent = profile.cityScopeLabel || store.city || "City";
  els.updatedText.textContent = relativeTime(intel.generatedAt);

  saveStores();
  renderStores();
  renderDashboard();
  renderBanners(intel.banners || []);
  renderFilters(intel.groups || []);
  renderStoreInfo();
  renderRestock();
  renderOpportunities(intel.opportunities || []);
  renderWarnings(intel.warnings || []);
  renderWeather(intel.weatherForecast || []);
  renderReviewLater();
  renderSignals(intel.groups || []);
    renderSourceHealth(intel.sourceHealth || []);
    renderChat();
    queuePageTranslation();
}

function renderBanners(banners) {
  const list = banners.length ? banners : [{ level: "info", title: "Monitoring", body: "Warden is checking the city for anything that should change staffing, inventory, safety or permits." }];
  els.bannerStack.innerHTML = list.slice(0, 4).map((banner) => `
    <div class="banner ${severityClass(banner.level)}">
      <div class="banner-icon">${bannerIcon(banner.level)}</div>
      <div>
        <div class="banner-title">${escapeHtml(banner.title)}</div>
        <div class="banner-body">${escapeHtml(banner.body)}</div>
      </div>
    </div>
  `).join("");
  queuePageTranslation();
}

function renderFilters(groups) {
  const filters = ["all", "Store Info", "Opportunities", "Warnings", "Weather & Climate", ...groups.map((group) => filterLabel(group.label))].filter(uniqueFilter);
  if (!filters.includes(state.activeSignalFilter) && state.activeSignalFilter !== "Restock") state.activeSignalFilter = "all";
  els.subTabs.innerHTML = filters.map((filter) => `
    <button class="filter-btn ${state.activeSignalFilter === filter ? "active" : ""}" data-filter="${escapeAttr(filter)}">${escapeHtml(filterButtonLabel(filter))}</button>
  `).join("");
  els.subTabs.querySelectorAll(".filter-btn").forEach((button) => button.addEventListener("click", () => setSignalFilter(button.dataset.filter)));
  queuePageTranslation();
}

function setSignalFilter(filter) {
  state.activeSignalFilter = filter;
  resetCardCache();
  renderFilters(state.latestIntel?.groups || []);
  renderStoreInfo();
  renderRestock();
  renderOpportunities(state.latestIntel?.opportunities || []);
  renderWarnings(state.latestIntel?.warnings || []);
  renderWeather(state.latestIntel?.weatherForecast || []);
  renderReviewLater();
  renderSignals(state.latestIntel?.groups || []);
  if (filter === "Store Info") scrollToSection(els.storeInfoSection);
  if (filter === "Restock") scrollToSection(els.restockSection);
  if (filter === "Opportunities") scrollToSection(els.opportunitiesSection);
  if (filter === "Warnings") scrollToSection(els.warningsSection);
  if (filter === "Weather & Climate") scrollToSection(els.weatherSection);
  queuePageTranslation();
}

function openStoreInfoView() {
  setSignalFilter("Store Info");
}

function openRestockView() {
  setSignalFilter("Restock");
  const store = selectedStore();
  if (!state.restockResults) {
    const suggestion = restockSuggestionsForStore(store)[0] || "chairs";
    els.restockQuery.value = suggestion;
    searchRestock(suggestion);
  } else {
    setTimeout(() => els.restockQuery?.focus(), 0);
  }
}

function openStoreNotesView() {
  state.activeSignalFilter = "all";
  resetCardCache();
  renderFilters(state.latestIntel?.groups || []);
  renderStoreInfo();
  renderRestock();
  renderOpportunities(state.latestIntel?.opportunities || []);
  renderWarnings(state.latestIntel?.warnings || []);
  renderWeather(state.latestIntel?.weatherForecast || []);
  renderReviewLater();
  renderSignals(state.latestIntel?.groups || []);
  scrollToSection(els.reviewLaterSection);
  queuePageTranslation();
}

function renderStoreInfo() {
  const store = selectedStore();
  if (!store) return;
  const show = state.activeSignalFilter === "Store Info";
  els.storeInfoSection.style.display = show ? "" : "none";
  els.storeInfoMeta.textContent = `${labelType(store.businessType)} · ${store.city || "City not set"}`;
  if (!show) return;

  const staff = [store.fullTimeStaff && `${store.fullTimeStaff} full-time`, store.partTimeStaff && `${store.partTimeStaff} part-time`].filter(Boolean).join(" / ") || "Not set";
  const profileRows = [
    ["Business name", store.businessName || "Unnamed storefront", locationLine(store), "wide"],
    ["Business type", `${iconType(store.businessType)} ${labelType(store.businessType)}`, store.cityScopeLabel || `${store.city || "City"} city-wide`, ""],
    ["Owner", store.ownerName || "Not set", contactLine(store), ""],
    ["Legal structure", store.legalStructure || "Not set", store.founded ? `Founded ${store.founded}` : "Founded date not set", ""],
    ["Staff", staff, store.languages ? `Languages: ${store.languages}` : "Languages not set", ""],
    ["Revenue profile", store.avgTicket || "Average ticket not set", store.dailyRevenue ? `Typical daily revenue: ${store.dailyRevenue}` : "Daily revenue not set", ""],
    ["Inventory exposure", store.inventoryValue || "Not set", store.suppliers ? `Suppliers: ${store.suppliers}` : "Suppliers not set", ""],
    ["Continuity", store.backupPower || "Backup power/cold storage not set", store.insuranceCarrier ? `Insurance: ${store.insuranceCarrier}` : "Insurance not set", ""],
    ["Security", store.securitySystem || "Not set", "Used for safety and closing recommendations", ""],
    ["License / permit notes", store.licenseNotes || "Not set", `${(store.licenses || []).length} saved license records`, "wide"],
    ["Document notes", store.documentNotes || "Not set", `${(store.documents || []).length} saved documents`, "wide"],
    ["Private operating notes", store.storeNotes || "Not set", "Used by the chatbot and owner actions for this store only", "full"]
  ];

  els.storeInfoPanel.innerHTML = profileRows.map(([label, value, note, span]) => `
    <article class="store-info-card ${escapeAttr(span || "")}">
      <div class="store-info-label">${escapeHtml(label)}</div>
      <div class="store-info-value">${escapeHtml(value)}</div>
      <div class="store-info-note">${escapeHtml(note || "")}</div>
    </article>
  `).join("");
  queuePageTranslation();
}

function renderRestock() {
  const store = selectedStore();
  if (!store) return;
  const show = state.activeSignalFilter === "Restock";
  els.restockSection.style.display = show ? "" : "none";
  const payload = state.restockResults;
  els.restockMeta.textContent = payload?.query ? `Top ${payload.options?.length || 0} for ${payload.query}` : "Compare suppliers";
  renderRestockSuggestions(payload?.suggestions || restockSuggestionsForStore(store));
  if (!show) return;

  if (state.restockLoading) {
    els.restockResults.innerHTML = `<div class="loading-stack">${loadingCards(5)}</div>`;
    queuePageTranslation();
    return;
  }

  if (!payload) {
    els.restockResults.innerHTML = `
      <div class="empty">Search what the store needs to restock. Warden will compare supplier options across Amazon, Walmart, Target, Costco, IKEA, Staples, Uline, WebstaurantStore and Home Depot.</div>
    `;
    queuePageTranslation();
    return;
  }

  els.restockResults.innerHTML = `
    <div class="restock-summary">
      <strong>${escapeHtml(payload.query)}</strong>
      <span>${escapeHtml(payload.summary || "")}</span>
      <div class="restock-disclaimer">${escapeHtml(payload.note || "Open supplier links to confirm live price and stock.")}</div>
    </div>
    <div class="restock-board" role="table" aria-label="Supplier comparison for ${escapeAttr(payload.query)}">
      <div class="restock-board-head" role="row">
        <span>Storefront</span>
        <span>Top product</span>
        <span>Price and unit</span>
        <span>Reviews / demand</span>
        <span>Stock and timing</span>
        <span>Owner action</span>
      </div>
      ${(payload.options || []).map(renderRestockCard).join("")}
    </div>
  `;
  queuePageTranslation();
}

function renderRestockSuggestions(suggestions) {
  els.restockSuggestions.innerHTML = (suggestions || []).map((suggestion) => `
    <button class="restock-chip" type="button" data-restock-suggestion="${escapeAttr(suggestion)}">${escapeHtml(restockSuggestionIcon(suggestion))} ${escapeHtml(suggestion)}</button>
  `).join("");
  els.restockSuggestions.querySelectorAll("[data-restock-suggestion]").forEach((button) => {
    button.addEventListener("click", () => {
      els.restockQuery.value = button.dataset.restockSuggestion;
      searchRestock(button.dataset.restockSuggestion);
    });
  });
  queuePageTranslation();
}

function renderRestockCard(item) {
  return `
    <article class="restock-row" role="row">
      <div class="restock-storefront" role="cell">
        <div class="restock-logo" aria-hidden="true">${escapeHtml(initials(item.provider))}</div>
        <div>
          <div class="restock-provider-line">
            <span class="restock-provider">${escapeHtml(item.provider)}</span>
            <span class="restock-score">${escapeHtml(String(item.score || 0))}/100</span>
          </div>
          <div class="restock-domain">${escapeHtml(item.domain || "supplier")}</div>
        </div>
      </div>
      <div class="restock-product" role="cell">
        <img class="restock-image" src="${escapeAttr(item.image)}" data-fallback-image="${escapeAttr(item.fallbackImage || item.image)}" alt="${escapeAttr(item.title)}" loading="lazy" onerror="this.onerror=null;this.src=this.dataset.fallbackImage" />
        <div>
          <div class="restock-title">${escapeHtml(item.title)}</div>
          <div class="restock-fit">${escapeHtml(item.fit || "Best use varies")}</div>
        </div>
      </div>
      <div class="restock-cell" role="cell"><span class="restock-mobile-label">Price and unit</span><span class="restock-price">${escapeHtml(item.price)}</span><strong>${escapeHtml(item.unitPrice || "Compare pack")}</strong><span>${escapeHtml(item.pack || "Pack varies")}</span></div>
      <div class="restock-cell" role="cell"><span class="restock-mobile-label">Reviews / demand</span><strong>${escapeHtml(item.reviewText || `${item.rating || "--"} stars / ${formatCount(item.reviews)} reviews`)}</strong><span>${escapeHtml(item.salesSignal || "Demand signal unavailable")}</span></div>
      <div class="restock-cell" role="cell"><span class="restock-mobile-label">Stock and timing</span><strong>${escapeHtml(item.stock || "Confirm stock")}</strong><span>${escapeHtml(item.eta || "Delivery varies")}</span></div>
      <div class="restock-actions" role="cell">
        <a class="source-link" href="${escapeAttr(item.url)}">View / buy</a>
        ${reviewButton(reviewCardFromRestock(item))}
      </div>
    </article>
  `;
}

function handleRestockSubmit(event) {
  event.preventDefault();
  const query = els.restockQuery.value.trim();
  if (!query) return;
  searchRestock(query);
}

async function searchRestock(query) {
  const store = selectedStore();
  if (!store) return;
  state.activeSignalFilter = "Restock";
  state.restockLoading = true;
  renderFilters(state.latestIntel?.groups || []);
  renderRestock();
  try {
    const response = await fetch(`/api/restock?${new URLSearchParams({ ...profileParams(store), q: query })}`);
    if (!response.ok) throw new Error(`Restock comparison failed with status ${response.status}`);
    state.restockResults = await response.json();
  } catch (error) {
    state.restockResults = {
      query,
      note: error.message,
      summary: "Supplier comparison could not load. Try again or open supplier search links manually.",
      suggestions: restockSuggestionsForStore(store),
      options: []
    };
  } finally {
    state.restockLoading = false;
    renderRestock();
    scrollToSection(els.restockSection);
  }
}

function restockSuggestionsForStore(store) {
  const type = normalizeType(store?.businessType);
  const common = ["cleaning supplies", "receipt paper", "storage shelves"];
  const byType = {
    restaurant: ["chairs", "takeout containers", "paper cups", "nitrile gloves"],
    "food stall": ["takeout containers", "paper cups", "nitrile gloves", "folding table"],
    "coffee shop": ["paper cups", "chairs", "napkins", "receipt paper"],
    grocery: ["storage shelves", "trash bags", "gloves", "labels"],
    retail: ["storage shelves", "shopping bags", "receipt paper", "display racks"],
    salon: ["cleaning supplies", "towels", "waiting chairs", "gloves"],
    barbershop: ["cleaning supplies", "waiting chairs", "towels", "clipper disinfectant"],
    laundromat: ["cleaning supplies", "storage bins", "trash bags", "folding table"],
    pharmacy: ["storage shelves", "labels", "receipt paper", "cleaning supplies"],
    daycare: ["cleaning supplies", "storage bins", "chairs", "paper towels"],
    "auto repair": ["storage shelves", "nitrile gloves", "shop towels", "trash bags"]
  };
  return [...new Set([...(byType[type] || []), ...common])].slice(0, 7);
}

function renderOpportunities(items) {
  const show = state.activeSignalFilter === "all" || state.activeSignalFilter === "Opportunities";
  els.opportunitiesSection.style.display = show ? "" : "none";
  els.opportunitiesMeta.textContent = `${items.length} actions`;
  if (!show) return;
  els.opportunitiesPanel.innerHTML = items.map((item) => `
    <article class="op-card">
      <div class="card-meta-row">
        <span class="card-type">${escapeHtml(actionIcon(item.type || "Opportunity"))} ${escapeHtml(item.type || "Opportunity")}</span>
        ${item.when ? `<span class="card-date">${escapeHtml(item.when)}</span>` : ""}
      </div>
      <div class="action-title">${escapeHtml(item.title)}</div>
      <div class="action-impact">${escapeHtml(item.impact || item.type || "Impact")}</div>
      <div class="action-copy"><b>Why it matters:</b> ${escapeHtml(item.why || "")}</div>
      <div class="action-copy owner-step"><b>Do this:</b> ${escapeHtml(item.action || "")}</div>
      <div class="check-list">${(item.checklist || []).map((check) => `<span>${escapeHtml(check)}</span>`).join("")}</div>
      <div class="evidence-row">${sourceAnchor(item.url, item.source)}${reviewButton(reviewCardFromAction("Opportunity", item))}</div>
    </article>
  `).join("") || `<div class="empty">No clear business opportunity found yet.</div>`;
  queuePageTranslation();
}

function renderWarnings(items) {
  const show = state.activeSignalFilter === "all" || state.activeSignalFilter === "Warnings";
  els.warningsSection.style.display = show ? "" : "none";
  const actionable = items.filter((item) => item.urgency !== "Low").length;
  els.warningsMeta.textContent = `${actionable} owner actions`;
  if (!show) return;
  els.warningsPanel.innerHTML = items.map((item) => `
    <article class="warning-card ${item.urgency === "High" ? "high" : ""}">
      <div class="card-meta-row">
        <span class="card-type">${escapeHtml(actionIcon(item.type || "Warning", item.urgency))} ${escapeHtml(item.urgency || "Review")} / ${escapeHtml(item.type || "Warning")}</span>
        ${item.when ? `<span class="card-date">${escapeHtml(item.when)}</span>` : ""}
      </div>
      <div class="action-title">${escapeHtml(item.title)}</div>
      <div class="action-impact">${escapeHtml(item.urgency === "High" ? "Act before the next shift" : "Owner review")}</div>
      <div class="action-copy"><b>Why it matters:</b> ${escapeHtml(item.why || "")}</div>
      <div class="action-copy owner-step"><b>Do this:</b> ${escapeHtml(item.action || "")}</div>
      <div class="check-list">${(item.pointers || []).map((check) => `<span>${escapeHtml(check)}</span>`).join("")}</div>
      <div class="evidence-row">${sourceAnchor(item.url, item.source)}${reviewButton(reviewCardFromAction("Warning", item))}</div>
    </article>
  `).join("") || `<div class="empty">No urgent owner action found yet.</div>`;
  queuePageTranslation();
}

function renderWeather(days) {
  const show = state.activeSignalFilter === "all" || state.activeSignalFilter === "Weather & Climate";
  els.weatherSection.style.display = show ? "" : "none";
  if (!show) return;
  els.weatherPanel.innerHTML = days.map((day) => `
    <article class="weather-card">
      <div class="weather-day"><span class="weather-emoji" aria-hidden="true">${escapeHtml(weatherEmoji(day.condition))}</span>${escapeHtml(day.day || day.date)}</div>
      <div class="weather-condition">${escapeHtml(day.condition || "Forecast")}</div>
      <div class="weather-stat"><span>High / low</span><b>${tempText(day.highF)} / ${tempText(day.lowF)}</b></div>
      <div class="weather-stat"><span>Rain</span><b>${percentText(day.rainProbability)}</b></div>
      <div class="weather-stat"><span>Wind</span><b>${mphText(day.windMph)}</b></div>
      <div class="evidence-row">${sourceAnchor(day.url, day.source)}${reviewButton(reviewCardFromWeather(day))}</div>
    </article>
  `).join("") || `<div class="empty">Weekly forecast has not loaded yet.</div>`;
  queuePageTranslation();
}

function renderSignals(groups) {
  if (state.activeSignalFilter === "Store Info" || state.activeSignalFilter === "Restock") {
    els.signalsRoot.innerHTML = "";
    queuePageTranslation();
    return;
  }
  let visible = groups;
  if (state.activeSignalFilter === "Warnings") {
    visible = groups.map((group) => ({
      ...group,
      signals: (group.signals || []).filter((signal) => signal.severity === "critical" || signal.severity === "warning")
    })).filter((group) => group.signals.length);
  } else if (state.activeSignalFilter === "Opportunities") {
    visible = groups.filter((group) => group.label === "Opportunities");
  } else if (state.activeSignalFilter === "Weather & Climate") {
    visible = groups.filter((group) => filterLabel(group.label) === "Weather & Climate");
  } else if (state.activeSignalFilter !== "all") {
    visible = groups.filter((group) => filterLabel(group.label) === state.activeSignalFilter);
  }

  if (!visible.length || !visible.some((group) => group.signals?.length)) {
    els.signalsRoot.innerHTML = `<div class="empty">No decision cards in this view.</div>`;
    queuePageTranslation();
    return;
  }
  const compact = state.activeSignalFilter === "all";
  els.signalsRoot.innerHTML = visible.map((group) => {
    const signals = compact ? group.signals.slice(0, 2) : group.signals;
    return `
    <section class="section-block">
      <div class="group-head"><span class="kicker">${escapeHtml(group.label)}</span><span class="group-count">${group.signals.length} signals</span></div>
      <div class="signal-grid ${compact ? "compact" : ""}">${signals.map((signal) => renderSignalCard(signal, compact)).join("")}</div>
    </section>
  `;
  }).join("");
  queuePageTranslation();
}

function renderSignalCard(signal, compact = false) {
  const evidenceUrl = readableUrl(signal.url);
  const location = signalLocationLabel(signal);
  const summary = compactSignalSummary(signal);
  return `
    <article class="signal-card ${severityClass(signal.severity)} ${compact ? "compact" : ""}">
      <div class="sig-top">
        <div class="row" style="justify-content:flex-start;min-width:0"><span class="sig-code" title="${escapeAttr(signal.code || "IN")}">${escapeHtml(signalIcon(signal))}</span><span class="sig-name">${escapeHtml(signal.name || signal.source || "Signal")}</span></div>
        <span class="sig-sev">${escapeHtml(labelSeverity(signal.severity))}</span>
      </div>
      <div class="sig-title">${escapeHtml(signal.headline || "Signal")}</div>
      ${signal.when ? `<div class="sig-metric">When: ${escapeHtml(signal.when)}</div>` : ""}
      <div class="sig-metric">${escapeHtml(location)}</div>
      <div class="sig-body">${escapeHtml(compact ? summary : signal.body || "")}</div>
      ${!compact && signal.action ? `<div class="sig-body owner-step"><b>Do this:</b> ${escapeHtml(signal.action)}</div>` : ""}
      ${Array.isArray(signal.pointers) && signal.pointers.length ? `<div class="check-list">${signal.pointers.map((check) => `<span>${escapeHtml(check)}</span>`).join("")}</div>` : ""}
      <div class="sig-foot"><span>${escapeHtml(signal.source || "evidence")}</span>${evidenceUrl ? `<a class="source-link" href="${escapeAttr(evidenceUrl)}" target="_blank" rel="noreferrer">View evidence</a>` : `<span>Store profile</span>`}</div>
      <div class="evidence-row">${reviewButton(reviewCardFromSignal(signal))}</div>
    </article>
  `;
}

function signalLocationLabel(signal) {
  const store = selectedStore();
  const metric = String(signal.metric || "").trim();
  const scope = store.cityScopeLabel || (store.city ? `${store.city} city-wide` : "City-wide");
  if (!metric || /^(watch|current|localized|city-wide|local|info)$/i.test(metric)) return `Area: ${scope}`;
  if (store.city && metric.toLowerCase() === store.city.toLowerCase()) return `Area: ${scope}`;
  if (/^\d+(\.\d+)?\s*(mi|m|km)\b/i.test(metric)) return `Distance: ${metric}`;
  if (/zone|aqi|pm2\.5|mph|f\b|records?|reports?|cases?|signals?|checks?/i.test(metric)) return metric;
  return `Area: ${metric}`;
}

function compactSignalSummary(signal) {
  const action = String(signal.action || "").trim();
  const body = String(signal.body || "").trim();
  const evidence = String(signal.evidenceTitle || "").trim();
  const text = action || body || evidence || "Review this item before changing staffing, inventory, safety, access or permits.";
  return compactSentence(text, 170);
}

function compactSentence(value, maxLength = 170) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const sliced = clean.slice(0, maxLength);
  const boundary = Math.max(sliced.lastIndexOf("."), sliced.lastIndexOf(";"), sliced.lastIndexOf(","));
  const cut = boundary > 80 ? sliced.slice(0, boundary) : sliced;
  return `${cut.trim().replace(/[.,;:]$/, "")}...`;
}

function renderSourceHealth(items) {
  els.sourceHealthList.innerHTML = items.map((item) => `
    <a class="source-row" href="${escapeAttr(item.url || "#")}" target="_blank" rel="noreferrer">
      <span class="dot ${item.ok ? "ok" : "warn"}"></span>
      <span><div class="small-title">${escapeHtml(sourceName(item.key))}</div><div class="small-meta">${escapeHtml(item.ok ? "Active" : "Unavailable this refresh")}</div></span>
      <span class="small-meta">${Number(item.count || 0)}</span>
    </a>
  `).join("") || `<div class="empty">No source checks yet.</div>`;
  queuePageTranslation();
}

function renderReviewLater() {
  const store = selectedStore();
  if (!store) return;
  const show = state.activeSignalFilter === "all";
  els.reviewLaterSection.style.display = show ? "" : "none";
  const items = reviewItemsForStore(store.id);
  els.reviewCount.textContent = items.length;
  els.storeNotesCount.textContent = items.length;
  els.reviewLaterMeta.textContent = `${items.length} saved for ${store.businessName || "this store"}`;
  if (!show) {
    queuePageTranslation();
    return;
  }
  els.reviewLaterList.innerHTML = items.map((item) => `
    <article class="review-card">
      <div class="action-title">${escapeHtml(item.title)}</div>
      <div class="review-meta">
        <span>${escapeHtml(item.kind)}</span>
        <span>Added ${escapeHtml(formatDateTime(item.addedAt))}</span>
        <span>About ${escapeHtml(item.articleDate || "Not dated")}</span>
      </div>
      <div class="action-copy">${escapeHtml(item.summary || "")}</div>
      <div class="row" style="justify-content:flex-start;gap:8px">
        ${item.url ? `<a class="source-link" href="${escapeAttr(readableUrl(item.url))}" target="_blank" rel="noreferrer">View evidence</a>` : `<span class="small-meta">Based on store profile</span>`}
        <button class="btn save-card-btn" data-remove-review="${escapeAttr(item.id)}">Remove</button>
      </div>
    </article>
  `).join("") || `<div class="empty">No notes saved for this store yet. Use Add to notes on any warning, weather, opportunity, or metric card.</div>`;
  queuePageTranslation();
}

function openChecksModal() {
  renderSourceHealth(state.latestIntel?.sourceHealth || []);
  els.checksModal.classList.add("open");
}

function closeChecksModal() {
  els.checksModal.classList.remove("open");
}

function handleReviewClick(event) {
  const saveButton = event.target.closest("[data-save-review]");
  if (saveButton) {
    const card = state.cardCache.get(saveButton.dataset.saveReview);
    if (card) saveReviewItem(card);
    return;
  }

  const removeButton = event.target.closest("[data-remove-review]");
  if (removeButton) {
    removeReviewItem(removeButton.dataset.removeReview);
  }
}

function reviewButton(card) {
  const id = cacheReviewCard(card);
  return `<button class="btn save-card-btn" data-save-review="${escapeAttr(id)}">Add to notes</button>`;
}

function cacheReviewCard(card) {
  const id = `card-${++state.cardSeq}`;
  state.cardCache.set(id, card);
  return id;
}

function resetCardCache() {
  state.cardCache = new Map();
  state.cardSeq = 0;
}

function reviewCardFromAction(kind, item) {
  return {
    kind,
    title: item.title || kind,
    summary: item.action || item.why || "",
    articleDate: item.when || "Not dated",
    source: item.source || "",
    url: readableUrl(item.url)
  };
}

function reviewCardFromWeather(day) {
  return {
    kind: "Weather",
    title: `${day.day || day.date}: ${day.condition || "Forecast"}`,
    summary: `High ${tempText(day.highF)}, low ${tempText(day.lowF)}, rain ${percentText(day.rainProbability)}, wind ${mphText(day.windMph)}.`,
    articleDate: day.day || day.date || "Not dated",
    source: day.source || "Weather",
    url: readableUrl(day.url)
  };
}

function reviewCardFromRestock(item) {
  return {
    kind: "Restock",
    title: `${item.provider}: ${item.title}`,
    summary: `${item.price} (${item.pack}). ${item.why || item.caution || ""}`,
    articleDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    source: item.provider || "Supplier",
    url: readableUrl(item.url)
  };
}

function reviewCardFromSignal(signal) {
  return {
    kind: signal.group || "Metric",
    title: signal.headline || signal.name || "Metric",
    summary: signal.action || signal.body || signal.metric || "",
    articleDate: signal.when || signal.metric || "Not dated",
    source: signal.source || "",
    url: readableUrl(signal.url)
  };
}

function saveReviewItem(card) {
  const store = selectedStore();
  const duplicate = state.reviewItems.find((item) =>
    item.storeId === store.id &&
    item.title === card.title &&
    item.articleDate === card.articleDate &&
    (item.url || "") === (card.url || "")
  );
  if (duplicate) {
    renderBanners([{ level: "info", title: "Already in notes", body: "That card is already saved in notes for this store." }]);
    scrollToSection(els.reviewLaterSection);
    return;
  }

  state.reviewItems.unshift({
    id: randomId(),
    storeId: store.id,
    storeName: store.businessName || "Store",
    kind: card.kind || "Metric",
    title: card.title || "Note item",
    summary: card.summary || "",
    articleDate: card.articleDate || "Not dated",
    source: card.source || "",
    url: card.url || "",
    addedAt: new Date().toISOString()
  });
  saveReviewItems();
  renderReviewLater();
  scrollToSection(els.reviewLaterSection);
}

function removeReviewItem(id) {
  state.reviewItems = state.reviewItems.filter((item) => item.id !== id);
  saveReviewItems();
  renderReviewLater();
}

function openChat() {
  state.chatOpen = true;
  renderChat();
  els.chatInput.focus();
}

function closeChat() {
  state.chatOpen = false;
  renderChat();
}

function renderChat() {
  const store = selectedStore();
  if (!store || !els.chatPanel) return;
  els.chatPanel.classList.toggle("open", state.chatOpen);
  els.chatContext.textContent = `${labelType(store.businessType)} · ${store.city || "city not set"} · ${store.businessName || "Store"}`;
  const thread = chatThreadForStore(store.id);
  const messages = thread.length ? thread : [{
    role: "assistant",
    text: chatGreeting(store),
    at: new Date().toISOString()
  }];
  els.chatMessages.innerHTML = messages.map((message) => `
    <div class="chat-msg ${message.role === "user" ? "user" : "assistant"}">
      <div>${escapeHtml(message.text || "")}</div>
      <div class="chat-time">${escapeHtml(formatDateTime(message.at))}</div>
    </div>
  `).join("");
  els.chatSuggestions.innerHTML = chatSuggestions(store).map((label) => `
    <button class="chat-chip" type="button" data-chat-suggestion="${escapeAttr(label)}">${escapeHtml(label)}</button>
  `).join("");
  els.chatSuggestions.querySelectorAll("[data-chat-suggestion]").forEach((button) => {
    button.addEventListener("click", () => sendChatMessage(button.dataset.chatSuggestion));
  });
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  queuePageTranslation();
}

function handleChatSubmit(event) {
  event.preventDefault();
  const text = els.chatInput.value.trim();
  if (!text) return;
  els.chatInput.value = "";
  sendChatMessage(text);
}

function sendChatMessage(text) {
  const store = selectedStore();
  if (!store) return;
  const now = new Date().toISOString();
  const thread = chatThreadForStore(store.id);
  thread.push({ role: "user", text, at: now });
  thread.push({ role: "assistant", text: buildChatReply(text), at: new Date().toISOString() });
  state.chatThreads[store.id] = thread.slice(-40);
  saveChatThreads();
  state.chatOpen = true;
  renderChat();
}

function chatThreadForStore(storeId) {
  if (!state.chatThreads[storeId]) state.chatThreads[storeId] = [];
  return state.chatThreads[storeId];
}

function chatGreeting(store) {
  return `I am focused on ${store.businessName || "this store"}, a ${labelType(store.businessType).toLowerCase()} in ${store.city || "this city"}. Ask me about warnings, opportunities, weather, competitors, permits, notes, or what to do next.`;
}

function chatSuggestions(store) {
  return [
    "What should I do today?",
    `How can this ${labelType(store.businessType).toLowerCase()} make more profit?`,
    "Summarize warnings",
    "Use media trends",
    "Check my notes"
  ];
}

function buildChatReply(input) {
  const store = selectedStore();
  const intel = state.latestIntel || {};
  const text = input.toLowerCase();
  const context = `${store.businessName || "This store"} is a ${labelType(store.businessType).toLowerCase()} in ${store.city || "this city"}.`;
  const storeFacts = compactStoreFacts(store);
  const warnings = (intel.warnings || []).filter((item) => item.urgency !== "Low");
  const opportunities = intel.opportunities || [];
  const weather = intel.weatherForecast || [];
  const mediaSignals = signalsByGroup("Media and Market");
  const marketSignals = signalsByGroup("Market and Competition");
  const complianceSignals = signalsByGroup("Compliance and Licensing");
  const notes = reviewItemsForStore(store.id);

  if (!state.latestIntel) {
    if (/(profit|revenue|sales|money|margin|promo|offer|grow|customer)/i.test(text)) {
      return [
        context,
        "",
        "The city scan is still loading, so I am using the saved store profile first.",
        baselineProfitAdvice(store),
        "",
        `Store context I am using: ${storeFacts}`
      ].join("\n");
    }
    return `${context}\n\nI am waiting for the city scan to finish. Based on the saved profile so far: ${storeFacts}\n\nBest next step: refresh the city scan, then ask me again about warnings, profit plays, weather, or permits.`;
  }

  if (/(today|now|next|priority|what should|do first|plan)/i.test(text)) {
    return [
      context,
      "",
      "Top moves right now:",
      ...numberedLines([
        warnings[0] ? `${warnings[0].title}: ${warnings[0].action}` : null,
        opportunities[0] ? `${opportunities[0].title}: ${opportunities[0].action}` : null,
        mediaSignals[0] ? `${mediaSignals[0].headline}: ${mediaSignals[0].action}` : null,
        weather[0] ? `Weather check: ${weather[0].day || weather[0].date} is ${weather[0].condition}; high ${tempText(weather[0].highF)}, rain ${percentText(weather[0].rainProbability)}.` : null
      ]),
      "",
      `Store context I am using: ${storeFacts}`
    ].join("\n");
  }

  if (/(profit|revenue|sales|money|margin|promo|offer|grow|customer)/i.test(text)) {
    const plays = [...mediaSignals, ...opportunities, ...marketSignals].filter(Boolean);
    return [
      context,
      "",
      `Profit plays tailored to a ${labelType(store.businessType).toLowerCase()}:`,
      ...numberedLines(plays.slice(0, 4).map((item) => `${item.headline || item.title}: ${item.action || item.body}`)),
      "",
      "Use one offer at a time and track redemptions, basket size, or bookings so you know what actually worked."
    ].join("\n");
  }

  if (/(media|market|trend|trending|news|city trend)/i.test(text)) {
    return [
      context,
      "",
      "City trend readout:",
      ...numberedLines(mediaSignals.slice(0, 4).map((item) => `${item.headline}: ${item.body} Do this: ${item.action}`)),
      mediaSignals.length ? "" : "No strong city trend card is loaded yet.",
      "I am treating the link as evidence; the decision should come from the action text, not the headline."
    ].join("\n");
  }

  if (/(warning|risk|crime|safety|danger|issue)/i.test(text)) {
    return [
      context,
      "",
      "Current owner warnings:",
      ...numberedLines(warnings.slice(0, 5).map((item) => `${item.title}${item.when ? ` (${item.when})` : ""}: ${item.action}`)),
      warnings.length ? "" : "No urgent warning is loaded for this store right now."
    ].join("\n");
  }

  if (/(weather|climate|rain|heat|hot|cold|storm|air)/i.test(text)) {
    const week = weather.slice(0, 7).map((day) => `${day.day || day.date}: ${day.condition}, high ${tempText(day.highF)}, rain ${percentText(day.rainProbability)}, wind ${mphText(day.windMph)}`);
    return [
      context,
      "",
      "Weather plan for this store:",
      ...numberedLines(week),
      "",
      weatherBusinessAdvice(store, weather)
    ].join("\n");
  }

  if (/(permit|license|inspection|compliance|document|health)/i.test(text)) {
    return [
      context,
      "",
      "Compliance items I see:",
      ...numberedLines(complianceSignals.slice(0, 5).map((item) => `${item.headline}: ${item.action || item.body}`)),
      "",
      `Saved license notes: ${store.licenseNotes || "none yet"}.`
    ].join("\n");
  }

  if (/(competitor|competition|nearby|market)/i.test(text)) {
    return [
      context,
      "",
      "Competition and positioning:",
      ...numberedLines(marketSignals.slice(0, 4).map((item) => `${item.headline}: ${item.action || item.body}`)),
      "",
      "Practical move: compare hours, photos, menu/service clarity, and one high-margin offer. Change one thing, then measure."
    ].join("\n");
  }

  if (/(note|notes|saved|remember)/i.test(text)) {
    return [
      context,
      "",
      "Store notes saved from cards:",
      ...numberedLines(notes.slice(0, 8).map((item) => `${item.title} | Added ${formatDateTime(item.addedAt)} | About ${item.articleDate}: ${item.summary}`)),
      notes.length ? "" : "No card notes are saved for this store yet. Use Add to notes on any useful card."
    ].join("\n");
  }

  if (/(summary|summarize|explain|context)/i.test(text)) {
    return [
      context,
      "",
      `Profile memory: ${storeFacts}`,
      `Risk index: ${store.risk || "--"}; opportunity index: ${store.opportunity || "--"}.`,
      `Warnings loaded: ${warnings.length}. Opportunities loaded: ${opportunities.length}. Notes saved: ${notes.length}.`,
      "",
      "Ask me for profit plays, warnings, weather, permits, competitors, or notes and I will answer using this store context."
    ].join("\n");
  }

  return [
    context,
    "",
    "I can answer using this store's saved profile and city scan. Best current read:",
    ...numberedLines([
      warnings[0] ? `${warnings[0].title}: ${warnings[0].action}` : null,
      opportunities[0] ? `${opportunities[0].title}: ${opportunities[0].action}` : null,
      mediaSignals[0] ? `${mediaSignals[0].headline}: ${mediaSignals[0].action}` : null
    ]),
    "",
    "Try asking: what should I do today, how do I make more profit, summarize warnings, use media trends, or check my notes."
  ].join("\n");
}

function compactStoreFacts(store) {
  return [
    labelType(store.businessType),
    store.city || "city not set",
    store.avgTicket && `average ticket ${store.avgTicket}`,
    store.fullTimeStaff && `${store.fullTimeStaff} full-time staff`,
    store.inventoryValue && `inventory exposure ${store.inventoryValue}`,
    store.backupPower && `backup power: ${store.backupPower}`,
    store.securitySystem && `security: ${store.securitySystem}`,
    store.storeNotes && `owner notes: ${store.storeNotes}`
  ].filter(Boolean).join("; ");
}

function signalsByGroup(label) {
  return (state.latestIntel?.groups || []).find((group) => group.label === label)?.signals || [];
}

function numberedLines(items) {
  const clean = (items || []).filter(Boolean);
  return clean.length ? clean.map((item, index) => `${index + 1}. ${item}`) : ["1. No matching item is loaded yet."];
}

function weatherBusinessAdvice(store, weather) {
  const type = normalizeType(store.businessType);
  const maxTemp = Math.max(...weather.map((day) => Number(day.highF)).filter(Number.isFinite));
  const maxRain = Math.max(...weather.map((day) => Number(day.rainProbability)).filter(Number.isFinite));
  if (type === "restaurant" || type === "food stall" || type === "coffee shop") {
    if (maxTemp >= 85) return "Business move: push cold drinks, quick meals, pickup, and pre-chill inventory before the hottest day.";
    if (maxRain >= 45) return "Business move: push pickup/delivery, confirm packaging stock, and keep labor flexible if walk-ins slow.";
    return "Business move: keep normal prep, but use the best weather day for signage and walk-up offers.";
  }
  if (type === "retail" || type === "grocery" || type === "pharmacy") {
    return "Business move: place weather-relevant items near checkout and watch basket size.";
  }
  return "Business move: use the forecast to adjust staffing, appointment windows, and customer messaging.";
}

function baselineProfitAdvice(store) {
  const type = normalizeType(store.businessType);
  if (type === "restaurant" || type === "food stall" || type === "coffee shop") {
    return "Restaurant profit move: pick one high-margin combo, make the price obvious, prep only the fastest sellers for the likely rush, and track redemptions instead of discounting the whole menu.";
  }
  if (type === "grocery" || type === "retail") {
    return "Store profit move: put one clear bundle near checkout, refresh the listing photos/hours, and track basket size for that offer.";
  }
  if (type === "salon" || type === "barbershop") {
    return "Appointment profit move: package one service plus a high-margin add-on, open a few peak slots, and track bookings from the offer.";
  }
  if (type === "laundromat") {
    return "Laundry profit move: promote wash-fold or quick-turn service, set clear pickup windows, and track pounds or orders from the offer.";
  }
  if (type === "pharmacy") {
    return "Pharmacy profit move: build one seasonal health kit near checkout and train staff on one practical add-on suggestion.";
  }
  if (type === "daycare") {
    return "Daycare profit move: publish available slots, offer tour windows, and follow up with every lead within one business day.";
  }
  if (type === "auto repair") {
    return "Auto repair profit move: promote one quick inspection package, reserve fast appointment slots, and track add-on work.";
  }
  return "Profit move: choose one clear offer, make it visible, track redemptions, and change only one variable at a time.";
}

function openStoreModal(mode) {
  state.modalMode = mode;
  const store = mode === "edit" ? selectedStore() : blankStore();
  state.modalSelectedType = normalizeType(store.businessType || "restaurant");
  els.modalKicker.textContent = mode === "edit" ? "Edit storefront" : "Add storefront";
  els.modalTitle.textContent = mode === "edit" ? `Edit ${store.businessName || "storefront"}` : "Add a complete storefront profile";
  fillModal(store);
  renderModalTypeGrid();
  els.storeModal.classList.add("open");
  els.modalName.focus();
}

function closeStoreModal() {
  els.storeModal.classList.remove("open");
}

function fillModal(store) {
  const fieldMap = {
    modalName: "businessName",
    modalAddress: "address",
    modalAddress2: "address2",
    modalCity: "city",
    modalState: "state",
    modalZip: "zip",
    modalOwner: "ownerName",
    modalOwnerPhone: "ownerPhone",
    modalOwnerEmail: "ownerEmail",
    modalLegalStructure: "legalStructure",
    modalFounded: "founded",
    modalFullTimeStaff: "fullTimeStaff",
    modalPartTimeStaff: "partTimeStaff",
    modalAvgTicket: "avgTicket",
    modalDailyRevenue: "dailyRevenue",
    modalInventoryValue: "inventoryValue",
    modalSuppliers: "suppliers",
    modalBackupPower: "backupPower",
    modalSecuritySystem: "securitySystem",
    modalInsuranceCarrier: "insuranceCarrier",
    modalLanguages: "languages",
    modalLicenseNotes: "licenseNotes",
    modalDocumentNotes: "documentNotes",
    modalStoreNotes: "storeNotes"
  };
  for (const [id, key] of Object.entries(fieldMap)) {
    els[id].value = store[key] || "";
  }
  els.modalState.value ||= "CA";
  els.modalTypeSearch.value = "";
}

function renderModalTypeGrid() {
  const query = els.modalTypeSearch.value.trim().toLowerCase();
  const list = BUSINESS_TYPES.filter((type) => matchesType(type, query)).slice(0, 12);
  const cards = list.length ? list : [{ id: query || "custom", label: titleCase(query || "Custom"), icon: "✳️", aliases: "" }];
  els.modalTypeGrid.innerHTML = cards.map((type) => `
    <button class="type-card ${type.id === state.modalSelectedType ? "active" : ""}" data-type="${escapeAttr(type.id)}">
      <span class="emoji">${escapeHtml(type.icon || "✳️")}</span>
      <span class="type-name">${escapeHtml(type.label)}</span>
    </button>
  `).join("");
  els.modalTypeGrid.querySelectorAll(".type-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.modalSelectedType = button.dataset.type;
      renderModalTypeGrid();
    });
  });
}

function saveStoreFromModal() {
  const existing = state.modalMode === "edit" ? selectedStore() : blankStore();
  const store = {
    ...existing,
    id: existing.id || randomId(),
    businessName: els.modalName.value.trim() || "Unnamed storefront",
    businessType: state.modalSelectedType || normalizeType(els.modalTypeSearch.value) || "retail",
    address: els.modalAddress.value.trim(),
    address2: els.modalAddress2.value.trim(),
    city: els.modalCity.value.trim() || inferCityFromAddress(els.modalAddress.value),
    state: normalizeState(els.modalState.value.trim() || "CA"),
    zip: els.modalZip.value.trim(),
    country: "US",
    ownerName: els.modalOwner.value.trim(),
    ownerPhone: els.modalOwnerPhone.value.trim(),
    ownerEmail: els.modalOwnerEmail.value.trim(),
    legalStructure: els.modalLegalStructure.value,
    founded: els.modalFounded.value.trim(),
    fullTimeStaff: els.modalFullTimeStaff.value.trim(),
    partTimeStaff: els.modalPartTimeStaff.value.trim(),
    avgTicket: els.modalAvgTicket.value.trim(),
    dailyRevenue: els.modalDailyRevenue.value.trim(),
    inventoryValue: els.modalInventoryValue.value.trim(),
    suppliers: els.modalSuppliers.value.trim(),
    backupPower: els.modalBackupPower.value.trim(),
    securitySystem: els.modalSecuritySystem.value.trim(),
    insuranceCarrier: els.modalInsuranceCarrier.value.trim(),
    languages: els.modalLanguages.value.trim(),
    licenseNotes: els.modalLicenseNotes.value.trim(),
    documentNotes: els.modalDocumentNotes.value.trim(),
    storeNotes: els.modalStoreNotes.value.trim(),
    licenses: existing.licenses || [],
    documents: existing.documents || []
  };
  delete store.lat;
  delete store.lon;
  delete store.cityScopeLabel;
  delete store.cityScopeSource;
  delete store.radiusMeters;

  if (state.modalMode === "edit") {
    const index = state.stores.findIndex((item) => item.id === state.selectedId);
    state.stores[index] = store;
  } else {
    state.stores.push(store);
    state.selectedId = store.id;
  }

  saveStores();
  closeStoreModal();
  state.activeSignalFilter = "all";
  renderStores();
  renderDashboard();
  refreshIntel();
}

function openDetailsModal() {
  const store = selectedStore();
  els.detailsTitle.textContent = store.businessName || "Store details";
  const details = [
    ["Business", `${iconType(store.businessType)} ${labelType(store.businessType)}`],
    ["Location", locationLine(store)],
    ["City monitor", store.cityScopeLabel || `${store.city || "City"} city-wide`],
    ["Owner", store.ownerName || "Not set"],
    ["Phone", store.ownerPhone || "Not set"],
    ["Email", store.ownerEmail || "Not set"],
    ["Legal structure", store.legalStructure || "Not set"],
    ["Founded", store.founded || "Not set"],
    ["Staff", [store.fullTimeStaff && `${store.fullTimeStaff} full-time`, store.partTimeStaff && `${store.partTimeStaff} part-time`].filter(Boolean).join(" / ") || "Not set"],
    ["Average ticket", store.avgTicket || "Not set"],
    ["Daily revenue", store.dailyRevenue || "Not set"],
    ["At-risk inventory", store.inventoryValue || "Not set"],
    ["Suppliers", store.suppliers || "Not set"],
    ["Backup power", store.backupPower || "Not set"],
    ["Security", store.securitySystem || "Not set"],
    ["Insurance", store.insuranceCarrier || "Not set"],
    ["Languages", store.languages || "Not set"],
    ["License notes", store.licenseNotes || "Not set"],
    ["Document notes", store.documentNotes || "Not set"],
    ["Private notes", store.storeNotes || "Not set"]
  ];
  els.detailsGrid.innerHTML = details.map(([label, value]) => `<div class="detail-box"><b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span></div>`).join("");
  els.detailsModal.classList.add("open");
}

function closeDetailsModal() {
  els.detailsModal.classList.remove("open");
}

function removeSelectedStore() {
  const store = selectedStore();
  if (state.stores.length <= 1) {
    renderBanners([{ level: "warning", title: "Keep at least one store", body: "Add another store before removing this one." }]);
    return;
  }
  if (!confirm(`Remove ${store.businessName || "this store"} from local Warden storage?`)) return;
  state.stores = state.stores.filter((item) => item.id !== store.id);
  state.reviewItems = state.reviewItems.filter((item) => item.storeId !== store.id);
  delete state.chatThreads[store.id];
  state.selectedId = state.stores[0].id;
  state.latestIntel = null;
  saveReviewItems();
  saveChatThreads();
  saveStores();
  renderStores();
  renderDashboard();
  refreshIntel();
}

function exportPdfReport() {
  document.title = `${selectedStore().businessName || "Warden"} - Warden report`;
  window.print();
}

function emailReport() {
  const store = selectedStore();
  const subject = encodeURIComponent(`Warden report - ${store.businessName || "store"}`);
  const body = encodeURIComponent(buildReportText());
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function buildReportText() {
  const store = selectedStore();
  const intel = state.latestIntel || {};
  const lines = [
    `Warden report: ${store.businessName || "Store"}`,
    `Location: ${locationLine(store)}`,
    `Monitoring area: ${store.cityScopeLabel || `${store.city || "City"} city-wide`}`,
    `Risk: ${store.risk || "--"} | Opportunity: ${store.opportunity || "--"}`,
    "",
    "Top warnings:",
    ...((intel.warnings || []).slice(0, 3).map((item) => `- ${item.title}${item.when ? ` (${item.when})` : ""}: ${item.action}`) || ["- Refresh city scan first."]),
    "",
    "Top opportunities:",
    ...((intel.opportunities || []).slice(0, 3).map((item) => `- ${item.title}${item.when ? ` (${item.when})` : ""}: ${item.action}`) || ["- Refresh city scan first."]),
    "",
    "Store notes:",
    ...reviewItemsForStore(store.id).slice(0, 5).map((item) => `- ${item.title} | Added ${formatDateTime(item.addedAt)} | About ${item.articleDate}`),
    ""
  ];
  return lines.join("\n");
}

function fallbackMetrics(store) {
  return [
    { label: "Monitoring Area", value: store.cityScopeLabel || `${store.city || "City"} city-wide`, detail: "Computed from city after refresh", tone: "info" },
    { label: "City Checks", value: "--", detail: "Waiting", tone: "warn" },
    { label: "Warnings", value: "--", detail: "Waiting", tone: "warn" },
    { label: "Opportunities", value: "--", detail: "Waiting", tone: "good" }
  ];
}

function sourceAnchor(url, source) {
  const evidenceUrl = readableUrl(url);
  return evidenceUrl ? `<a class="source-link" href="${escapeAttr(evidenceUrl)}" target="_blank" rel="noreferrer">View evidence${source ? `: ${escapeHtml(source)}` : ""}</a>` : `<span class="small-meta">Based on saved store profile</span>`;
}

function loadingCards(count) {
  return Array.from({ length: count }, () => `<div class="loading-card" aria-hidden="true"></div>`).join("");
}

function scrollToSection(section) {
  section?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setLoading(loading) {
  els.refreshTopBtn.disabled = loading;
  els.refreshTopBtn.innerHTML = loading ? `<span class="btn-emoji">🔎</span>${escapeHtml(t("scanning"))}` : `<span class="btn-emoji">↻</span>${escapeHtml(t("scan"))}`;
  document.body.classList.toggle("is-loading", loading);
  els.refreshTopBtn.setAttribute("aria-busy", loading ? "true" : "false");
}

function selectedStore() {
  return state.stores.find((store) => store.id === state.selectedId) || state.stores[0];
}

function blankStore() {
  return {
    id: "",
    businessName: "",
    businessType: "restaurant",
    address: "",
    address2: "",
    city: "",
    state: "CA",
    zip: "",
    country: "US",
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    legalStructure: "LLC",
    founded: "",
    fullTimeStaff: "",
    partTimeStaff: "",
    avgTicket: "",
    dailyRevenue: "",
    inventoryValue: "",
    suppliers: "",
    backupPower: "",
    securitySystem: "",
    insuranceCarrier: "",
    languages: "",
    licenseNotes: "",
    documentNotes: "",
    storeNotes: "",
    licenses: [],
    documents: [],
    risk: 0,
    opportunity: 0
  };
}

function saveStores() {
  localStorage.setItem("warden:stores", JSON.stringify(state.stores));
  localStorage.setItem("warden:selectedStore", state.selectedId);
}

function saveReviewItems() {
  localStorage.setItem("warden:reviewLater", JSON.stringify(state.reviewItems.slice(0, 200)));
}

function loadReviewItems() {
  try {
    const parsed = JSON.parse(localStorage.getItem("warden:reviewLater") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveChatThreads() {
  const compact = Object.fromEntries(Object.entries(state.chatThreads).map(([storeId, thread]) => [storeId, (thread || []).slice(-40)]));
  localStorage.setItem("warden:chatThreads", JSON.stringify(compact));
}

function loadChatThreads() {
  try {
    const parsed = JSON.parse(localStorage.getItem("warden:chatThreads") || "{}");
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function reviewItemsForStore(storeId) {
  return state.reviewItems
    .filter((item) => item.storeId === storeId)
    .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
}

function loadStores() {
  try {
    const raw = localStorage.getItem("warden:stores");
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length ? parsed.map(migrateStore) : structuredClone(DEFAULT_STORES);
  } catch {
    return structuredClone(DEFAULT_STORES);
  }
}

function migrateStore(store) {
  const migrated = { ...structuredClone(DEFAULT_STORES[0]), ...store };
  if (!migrated.fullTimeStaff && migrated.staff) migrated.fullTimeStaff = migrated.staff;
  migrated.licenses ||= [];
  migrated.documents ||= [];
  migrated.businessType = normalizeType(migrated.businessType);
  return migrated;
}

function matchesType(type, query) {
  if (!query) return true;
  return `${type.id} ${type.label} ${type.aliases}`.toLowerCase().includes(query);
}

function storeSearchText(store) {
  return `${store.businessName} ${store.businessType} ${store.address} ${store.city} ${store.ownerName}`.toLowerCase();
}

function joinStoreAddress(store) {
  return [store.address, store.address2, store.city, store.state, store.zip].map((part) => String(part || "").trim()).filter(Boolean).join(", ");
}

function locationLine(store) {
  return [store.address, store.address2, store.city, store.state].map((part) => String(part || "").trim()).filter(Boolean).join(", ") || "Location not set";
}

function contactLine(store) {
  return [store.ownerPhone, store.ownerEmail].map((part) => String(part || "").trim()).filter(Boolean).join(" / ") || "Contact not set";
}

function normalizeType(type) {
  const clean = String(type || "retail").toLowerCase().trim();
  const map = {
    cafe: "restaurant",
    food: "restaurant",
    "food stall": "food stall",
    stall: "food stall",
    grocery: "grocery",
    shop: "retail",
    store: "retail",
    salon: "salon",
    barber: "barbershop",
    barbershop: "barbershop",
    laundromat: "laundromat",
    pharmacy: "pharmacy",
    daycare: "daycare",
    auto: "auto repair"
  };
  return map[clean] || clean || "retail";
}

function normalizeState(value) {
  if (/^california$/i.test(value)) return "CA";
  return value || "CA";
}

function inferCityFromAddress(address) {
  const text = String(address || "").toLowerCase();
  return ["San Francisco", "Santa Clara", "San Jose", "Oakland", "Berkeley", "Palo Alto", "Mountain View", "Sunnyvale", "San Mateo"].find((city) => text.includes(city.toLowerCase())) || "";
}

function labelType(type) {
  return BUSINESS_TYPES.find((item) => item.id === normalizeType(type))?.label || titleCase(type || "Business");
}

function iconType(type) {
  return BUSINESS_TYPES.find((item) => item.id === normalizeType(type))?.icon || "🏬";
}

function metricIcon(label, tone = "") {
  const text = String(label || "").toLowerCase();
  if (text.includes("monitor") || text.includes("area") || text.includes("radius")) return "📍";
  if (text.includes("city") || text.includes("check")) return "✓";
  if (text.includes("warning") || tone === "risk") return "⚠️";
  if (text.includes("opportun")) return "💡";
  if (text.includes("weather") || text.includes("window")) return "🌤️";
  if (text.includes("signal")) return "📡";
  if (text.includes("notes")) return "📝";
  return "•";
}

function filterButtonLabel(filter) {
  const labels = {
    all: t("overview"),
    "Store Info": t("storeInfo"),
    Opportunities: t("opportunities"),
    Warnings: t("warnings"),
    "Weather & Climate": t("weather")
  };
  return labels[filter] || `${groupIcon(filter)} ${filter}`;
}

function t(key) {
  return TRANSLATIONS[state.language]?.[key] || TRANSLATIONS.en[key] || key;
}

function groupIcon(label) {
  const text = String(label || "").toLowerCase();
  if (text.includes("crime") || text.includes("safety")) return "🛡️";
  if (text.includes("market") || text.includes("media")) return "📈";
  if (text.includes("regulatory") || text.includes("license") || text.includes("compliance")) return "📋";
  if (text.includes("infrastructure") || text.includes("311") || text.includes("access")) return "🚧";
  if (text.includes("event")) return "🎟️";
  if (text.includes("weather") || text.includes("climate")) return "🌤️";
  return "•";
}

function actionIcon(type = "", urgency = "") {
  const text = `${type} ${urgency}`.toLowerCase();
  if (text.includes("high") || text.includes("critical") || text.includes("safety") || text.includes("crime")) return "⚠️";
  if (text.includes("weather") || text.includes("climate")) return "🌤️";
  if (text.includes("market") || text.includes("media") || text.includes("competition")) return "📈";
  if (text.includes("permit") || text.includes("license") || text.includes("regulatory")) return "📋";
  if (text.includes("restock") || text.includes("supplier")) return "📦";
  return "💡";
}

function weatherEmoji(condition = "") {
  const text = String(condition).toLowerCase();
  if (text.includes("thunder") || text.includes("storm")) return "⛈️";
  if (text.includes("rain") || text.includes("shower") || text.includes("drizzle")) return "🌧️";
  if (text.includes("cloud") || text.includes("overcast")) return "☁️";
  if (text.includes("fog") || text.includes("mist")) return "🌫️";
  if (text.includes("snow") || text.includes("ice")) return "❄️";
  if (text.includes("hot") || text.includes("heat")) return "🌡️";
  if (text.includes("sun") || text.includes("clear")) return "☀️";
  return "🌤️";
}

function signalIcon(signal = {}) {
  const text = `${signal.group || ""} ${signal.name || ""} ${signal.code || ""} ${signal.severity || ""}`.toLowerCase();
  if (text.includes("weather") || text.includes("climate") || text.includes("wx")) return "🌤️";
  if (text.includes("crime") || text.includes("safety") || text.includes("safe")) return "🛡️";
  if (text.includes("market") || text.includes("media") || text.includes("competition") || text.includes("mkt")) return "📈";
  if (text.includes("regulatory") || text.includes("license") || text.includes("permit")) return "📋";
  if (text.includes("infrastructure") || text.includes("access") || text.includes("311")) return "🚧";
  if (text.includes("event")) return "🎟️";
  if (signal.severity === "critical" || signal.severity === "warning") return "⚠️";
  if (signal.severity === "opportunity") return "💡";
  return "📡";
}

function restockSuggestionIcon(value = "") {
  const text = String(value).toLowerCase();
  if (text.includes("chair") || text.includes("table") || text.includes("rack")) return "🪑";
  if (text.includes("container") || text.includes("cup") || text.includes("napkin") || text.includes("spoon") || text.includes("fork")) return "🍽️";
  if (text.includes("glove") || text.includes("clean") || text.includes("towel") || text.includes("trash")) return "🧤";
  if (text.includes("paper") || text.includes("label") || text.includes("receipt")) return "🧾";
  if (text.includes("shelf") || text.includes("storage") || text.includes("bin")) return "📦";
  return "🔎";
}

function initials(name) {
  const words = String(name || "W").match(/[A-Za-z0-9]+/g) || ["W"];
  return words.length === 1 ? words[0].slice(0, 2).toUpperCase() : `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function sourceName(key) {
  const names = {
    weather: "Weather",
    air: "Air quality",
    alerts: "NWS alerts",
    police: "Police incidents",
    cases311: "311 cases",
    marketScan: "OSM market scan",
    citySafety: "City safety",
    cityInfrastructure: "Infrastructure",
    cityEconomy: "City economy",
    news: "Local media",
    regulatory: "Regulatory",
    localEvents: "Events",
    earthquakes: "Earthquakes",
    eonet: "Natural events",
  };
  return names[key] || titleCase(key);
}

function titleCase(value) {
  return String(value || "").replace(/\b\w/g, (char) => char.toUpperCase());
}

function shortAddress(value) {
  const firstLine = String(value || "Location").split(",")[0].trim();
  return firstLine.length > 30 ? `${firstLine.slice(0, 29)}...` : firstLine;
}

function relativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waiting";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  return seconds < 15 ? "Updated now" : seconds < 60 ? `Updated ${seconds}s ago` : `Updated ${Math.round(seconds / 60)}m ago`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function tempText(value) {
  return Number.isFinite(Number(value)) ? `${Math.round(Number(value))}°F` : "--";
}

function percentText(value) {
  return Number.isFinite(Number(value)) ? `${Math.round(Number(value))}%` : "--";
}

function formatCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}k`;
  return String(Math.round(number));
}

function mphText(value) {
  return Number.isFinite(Number(value)) ? `${Math.round(Number(value))} mph` : "--";
}

function severityClass(value) {
  if (["critical", "warning", "opportunity", "good", "warn", "risk"].includes(value)) return value;
  return "info";
}

function labelSeverity(value) {
  if (value === "critical") return "High";
  if (value === "warning") return "Warning";
  if (value === "opportunity") return "Opportunity";
  return "Info";
}

function bannerIcon(level) {
  if (level === "critical" || level === "warning") return "⚠️";
  if (level === "opportunity") return "💡";
  return "ℹ️";
}

function uniqueFilter(value, index, arr) {
  return arr.indexOf(value) === index;
}

function filterLabel(label) {
  return label === "Weather and Climate" ? "Weather & Climate" : label;
}

function randomId() {
  return crypto.randomUUID ? crypto.randomUUID() : `store-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shortUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function readableUrl(url) {
  if (!url) return "";
  const text = String(url);
  if (text.includes("overpass-api.de/api/interpreter")) {
    const store = selectedStore();
    if (Number.isFinite(Number(store.lat)) && Number.isFinite(Number(store.lon))) {
      return `https://www.openstreetmap.org/#map=13/${Number(store.lat).toFixed(5)}/${Number(store.lon).toFixed(5)}`;
    }
    return "https://www.openstreetmap.org/";
  }
  if (text.includes("api.open-meteo.com")) {
    const store = selectedStore();
    if (Number.isFinite(Number(store.lat)) && Number.isFinite(Number(store.lon))) {
      return `https://forecast.weather.gov/MapClick.php?lat=${Number(store.lat).toFixed(4)}&lon=${Number(store.lon).toFixed(4)}`;
    }
    return "https://www.weather.gov/";
  }
  if (text.includes("api.gdeltproject.org/api/v2/doc/doc")) {
    const store = selectedStore();
    const q = [store.city, labelType(store.businessType), "small business"].filter(Boolean).join(" ");
    return `https://news.google.com/search?${new URLSearchParams({ q, hl: "en-US", gl: "US", ceid: "US:en" })}`;
  }
  if (text.includes("news.google.com/rss/search")) {
    return text.replace("/rss/search", "/search");
  }
  return text;
}

function clampNumber(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
