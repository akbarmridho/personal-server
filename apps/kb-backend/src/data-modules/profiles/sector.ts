export const normalizeSector = (value: string) => {
  return value
    .replace(/&/g, "and")
    .replace(",", "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
};

export const sectors: Array<{
  name: string;
  subsectors: Array<{
    name: string;
    description: string;
    industries: Array<{
      name: string;
      subindustries: Array<{
        name: string;
      }>;
    }>;
  }>;
}> = [
  {
    name: "basic-materials",
    subsectors: [
      {
        name: "basic-materials",
        description:
          "The Basic Materials sector covers the extraction, processing, and distribution of raw materials like minerals, metals, chemicals, and construction materials. The industry is regulated by the Ministry of Industry and the Ministry of Energy and Mineral Resources (ESDM), with support from organizations like the Indonesian Mining Association (IMA) the Indonesian Iron & Steel Industry Association (IISIA) and the Indonesian Cement Association (ASI).",
        industries: [
          {
            name: "chemicals",
            subindustries: [
              {
                name: "agricultural-chemicals",
              },
              {
                name: "basic-chemicals",
              },
              {
                name: "specialty-chemicals",
              },
            ],
          },
          {
            name: "construction-materials",
            subindustries: [
              {
                name: "construction-materials",
              },
            ],
          },
          {
            name: "containers-and-packaging",
            subindustries: [
              {
                name: "containers-and-packaging",
              },
            ],
          },
          {
            name: "forestry-and-paper",
            subindustries: [
              {
                name: "diversified-forest",
              },
              {
                name: "paper",
              },
              {
                name: "timber",
              },
            ],
          },
          {
            name: "metals-and-minerals",
            subindustries: [
              {
                name: "aluminum",
              },
              {
                name: "cooper",
              },
              {
                name: "diversified-metals-and-minerals",
              },
              {
                name: "gold",
              },
              {
                name: "iron-and-steel",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "consumer-cyclicals",
    subsectors: [
      {
        name: "apparel-and-luxury-goods",
        description:
          "The Apparel & Luxury Goods sector encompasses the production, marketing, and sale of clothing, footwear, accessories, and high-end fashion products. In Indonesia, this sector is represented by premium outlets and luxury shopping destinations such as Plaza Indonesia, Pacific Place, and Jakarta Premium Outlets in Jakarta, as well as high-end shopping malls like Bali Collection in Bali, which feature top global luxury brands.",
        industries: [
          {
            name: "apparel-and-luxury-goods",
            subindustries: [
              {
                name: "clothing-accessories-and-bags",
              },
              {
                name: "footwear",
              },
              {
                name: "textiles",
              },
            ],
          },
        ],
      },
      {
        name: "automobiles-and-components",
        description:
          "TThe Automobiles & Components sector covers the manufacturing, assembly, and distribution of vehicles, spare parts, and automotive accessories. In Indonesia, this sector is regulated by the Ministry of Industry (Kementerian Perindustrian). The Indonesian Automotive Industry Association (GAIKINDO), supports the sector by organizing a major annual automotive event, GAIKINDO Indonesia International Auto Show (GIIAS), which spans a full month and showcases the latest innovations and trends in the automotive industry.",
        industries: [
          {
            name: "auto-components",
            subindustries: [
              {
                name: "auto-parts-and-equipment",
              },
              {
                name: "tires",
              },
            ],
          },
        ],
      },
      {
        name: "consumer-services",
        description:
          "The Consumer Services sector includes businesses that provide services directly to consumers, such as hospitality, tourism, education, and personal care. It enhances the quality of life by offering recreational, wellness, and lifestyle services.",
        industries: [
          {
            name: "education-and-support-services",
            subindustries: [
              {
                name: "education-services",
              },
            ],
          },
          {
            name: "tourism-and-recreation",
            subindustries: [
              {
                name: "hotels-resorts-and-cruise-lines",
              },
              {
                name: "recreational-and-sports-facilities",
              },
              {
                name: "restaurants",
              },
              {
                name: "travel-agencies",
              },
            ],
          },
        ],
      },
      {
        name: "household-goods",
        description:
          "The Household Goods sector produces and distributes essential products used in daily life, including furniture, home appliances, kitchenware, and decorative items. The industry is regulated by the Ministry of Industry and supported by organizations such as the Indonesian Furniture Association (ASMINDO) and the Indonesian Household Appliances Association (HIPMI), ensuring quality standards and industry development.",
        industries: [
          {
            name: "household-goods",
            subindustries: [
              {
                name: "home-furnishings",
              },
              {
                name: "household-appliances",
              },
              {
                name: "housewares-and-specialties",
              },
            ],
          },
        ],
      },
      {
        name: "leisure-goods",
        description:
          "The Leisure Goods sector includes products designed for recreation and personal enjoyment, such as sports equipment, gaming consoles, musical instruments, and outdoor activity gear. In Indonesia, this sector is regulated by the Ministry of Tourism and Creative Economy (Kementerian Pariwisata dan Ekonomi Kreatif).",
        industries: [
          {
            name: "consumer-electronics",
            subindustries: [
              {
                name: "consumer-electronics",
              },
            ],
          },
          {
            name: "sport-equipment-and-hobbies-goods",
            subindustries: [
              {
                name: "sport-equipment-and-hobbies-goods",
              },
            ],
          },
        ],
      },
      {
        name: "media-and-entertainment",
        description:
          "The Media & Entertainment sector encompasses television, radio, print media, film, music, and digital content production. In Indonesia, this sector is regulated by the Ministry of Communication and Informatics (Kementerian Komunikasi dan Informatika), which oversees media licensing, broadcasting standards, and digital content management.",
        industries: [
          {
            name: "entertainment-and-movie-production",
            subindustries: [
              {
                name: "entertainment-and-movie-production",
              },
            ],
          },
          {
            name: "media",
            subindustries: [
              {
                name: "advertising",
              },
              {
                name: "broadcasting",
              },
              {
                name: "cable-and-satellite",
              },
              {
                name: "consumer-publishing",
              },
            ],
          },
        ],
      },
      {
        name: "retailing",
        description:
          "The Retailing sector consists of businesses selling a variety of consumer products, including clothing, electronics, household goods, and personal items, through physical stores, department stores, and e-commerce platforms. The industry is regulated by the Ministry of Trade and supported by organizations such as the Indonesian Retailers Association (APRINDO) and the Indonesian E-Commerce Association (idEA).",
        industries: [
          {
            name: "consumer-distributors",
            subindustries: [
              {
                name: "consumer-distributors",
              },
            ],
          },
          {
            name: "department-stores",
            subindustries: [
              {
                name: "department-stores",
              },
            ],
          },
          {
            name: "specialty-retail",
            subindustries: [
              {
                name: "apparel-and-textile-retail",
              },
              {
                name: "automotive-retail",
              },
              {
                name: "electronics-retail",
              },
              {
                name: "home-improvement-retail",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "consumer-non-cyclicals",
    subsectors: [
      {
        name: "food-and-beverage",
        description:
          "The Food & Beverage sector in Indonesia focuses on processing, manufacturing, and distributing a wide range of food products and beverages, including key exports like coffee, tea, and palm oil. The sector is regulated by the Ministry of Agriculture (Kementerian Pertanian), which sets food safety standards and ensures quality control. The Indonesian Food and Beverage Association (GAPMMI) supports the sector by promoting innovation, improving industry standards, and facilitating trade for local products.",
        industries: [
          {
            name: "agricultural-products",
            subindustries: [
              {
                name: "fish-meat,-and-poultry",
              },
              {
                name: "plantations-and-crops",
              },
            ],
          },
          {
            name: "beverages",
            subindustries: [
              {
                name: "liquors",
              },
              {
                name: "soft-drinks",
              },
            ],
          },
          {
            name: "processed-foods",
            subindustries: [
              {
                name: "dairy-products",
              },
              {
                name: "processed-foods",
              },
            ],
          },
        ],
      },
      {
        name: "food-and-staples-retailing",
        description:
          "The Food & Staples Retailing sector includes supermarkets, minimarkets, traditional markets, and online grocery platforms that distribute essential food items and daily necessities. It connects producers with consumers, ensuring food accessibility and affordability. The industry is regulated by the Ministry of Trade and supported by organizations like the Indonesian Retailers Association (APRINDO) to maintain standards and support growth.",
        industries: [
          {
            name: "food-and-staples-retailing",
            subindustries: [
              {
                name: "drug-retail-and-distributors",
              },
              {
                name: "food-retail-and-distributors",
              },
              {
                name: "supermarkets-and-convenience-store",
              },
            ],
          },
        ],
      },
      {
        name: "nondurable-household-products",
        description:
          "The Nondurable Household Products sector focuses on consumable items such as cleaning supplies, toiletries, paper products, and other fast-moving consumer goods that are regularly purchased and used in homes. The industry is regulated by the **Ministry of Industry** and supported by organizations like the **Indonesian Household and Personal Care Association (HIPMI)** to ensure quality standards and product safety.",
        industries: [
          {
            name: "personal-care-products",
            subindustries: [
              {
                name: "personal-care-products",
              },
            ],
          },
        ],
      },
      {
        name: "tobacco",
        description:
          "The Tobacco sector involves the cultivation, manufacturing, and distribution of tobacco products, including cigarettes and cigars. It is a significant part of Indonesia's economy, with widespread domestic production and export activities. The industry is regulated by the Ministry of Industry and the Ministry of Agriculture, with support from organizations such as the Indonesian Tobacco Growers Association (APTI) and the Indonesian Cigarette Manufacturers Association (GAPPRI).",
        industries: [
          {
            name: "tobacco",
            subindustries: [
              {
                name: "tobacco",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "energy",
    subsectors: [
      {
        name: "alternative-energy",
        description:
          "The Alternative Energy sector focuses on the generation and distribution of renewable energy sources such as solar, wind, hydro, and bioenergy. In Indonesia, this sector is regulated by the Ministry of Energy and Mineral Resources (Kementerian Energi dan Sumber Daya Mineral), which oversees renewable energy policies and projects. Additionally, Perusahaan Listrik Negara (PLN), Indonesia's state-owned electricity company, plays a key role in integrating renewable energy into the national grid and expanding the use of sustainable energy sources.",
        industries: [
          {
            name: "alternative-energy-equipment",
            subindustries: [
              {
                name: "alternative-energy-equipment",
              },
            ],
          },
        ],
      },
      {
        name: "oil-gas-and-coal",
        description:
          "The Oil, Gas & Coal sector in Indonesia is responsible for the exploration, extraction, refining, and distribution of fossil fuels. It is regulated by the Ministry of Energy and Mineral Resources (Kementerian Energi dan Sumber Daya Mineral). A non-profit organization, Indonesian Oil & Gas Society (IATMI), supports energy professionals and promotes sustainable practices in the industry. Indonesia is also one of the largest coal producers in the world, with significant exports to countries like China and India.",
        industries: [
          {
            name: "coal",
            subindustries: [
              {
                name: "coal-distribution",
              },
              {
                name: "coal-production",
              },
            ],
          },
          {
            name: "oil-and-gas",
            subindustries: [
              {
                name: "oil-and-gas-production-and-refinery",
              },
              {
                name: "oil-and-gas-storage-and-distribution",
              },
            ],
          },
          {
            name: "oil-gas-and-coal-supports",
            subindustries: [
              {
                name: "oil-and-gas-drilling-service",
              },
              {
                name: "oil-gas-and-coal-equipment-and-services",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "financials",
    subsectors: [
      {
        name: "banks",
        description:
          "The Banks sector is one of the biggest sectors in Indonesia, it encompasses a wide range of financial institutions, including commercial banks, state-owned banks, and regional banks. The sector is regulated by the Financial Services Authority (OJK - Otoritas Jasa Keuangan), which ensures financial stability, consumer protection, and the integrity of the banking system.",
        industries: [
          {
            name: "banks",
            subindustries: [
              {
                name: "banks",
              },
            ],
          },
        ],
      },
      {
        name: "financing-service",
        description:
          "The Financing Service sector in Indonesia includes non-bank financial institutions, fintech companies, and microfinance providers. This sector plays a critical role in increasing financial inclusion and providing accessible financing options to underserved markets. Regulated by the Financial Services Authority (OJK - Otoritas Jasa Keuangan), the sector ensures consumer protection, transparency, and financial stability. Key industry players like OJK’s Fintech Division and the Indonesian Association of Microfinance Institutions (APIMI) are crucial in supporting innovation and growth in the sector.",
        industries: [
          {
            name: "consumer-financing",
            subindustries: [
              {
                name: "consumer-financing",
              },
            ],
          },
        ],
      },
      {
        name: "holding-and-investment-companies",
        description:
          "The Holding & Investment Companies sector consists of entities that manage diversified investment portfolios across multiple industries, ensuring financial stability and strategic business expansion in various economic sectors. The industry is regulated by the Financial Services Authority (OJK) and supported by organizations such as the Indonesian Chamber of Commerce and Industry (KADIN Indonesia) and the Indonesian Issuers Association (AEI).",
        industries: [
          {
            name: "holding-and-investment-companies",
            subindustries: [
              {
                name: "financial-holdings",
              },
              {
                name: "investment-companies",
              },
            ],
          },
        ],
      },
      {
        name: "insurance",
        description:
          "The Insurance sector provides financial protection for individuals and businesses through policies like health, life, vehicle, and property insurance. The industry is regulated by the Financial Services Authority (OJK) and supported by organizations like AAUI (Indonesian General Insurance Association) and AAJI (Indonesian Life Insurance Association) to ensure compliance and industry growth.",
        industries: [
          {
            name: "insurance",
            subindustries: [
              {
                name: "general-insurance",
              },
              {
                name: "life-insurance",
              },
              {
                name: "reinsurance",
              },
            ],
          },
        ],
      },
      {
        name: "investment-service",
        description:
          "The Investment Service sector provides financial management, securities trading, wealth advisory, and capital allocation services. It facilitates investment opportunities for individuals and businesses seeking to grow their financial assets. The industry is regulated by the Financial Services Authority (OJK) and supported by organizations such as the Indonesia Stock Exchange (IDX) and the Indonesian Investment Managers Association (APRDI).",
        industries: [
          {
            name: "investment-services",
            subindustries: [
              {
                name: "investment-banking-and-brokerage-services",
              },
              {
                name: "investment-management",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "healthcare",
    subsectors: [
      {
        name: "healthcare-equipment-and-providers",
        description:
          "The Healthcare Equipment & Providers sector includes hospitals, medical clinics, diagnostic centers, and suppliers of medical devices and equipment. It supports healthcare services by providing essential infrastructure, medical treatments, and patient care. The industry is regulated by the Ministry of Health and supported by organizations such as the Indonesian Hospital Association (PERSI) and the Indonesian Medical Device Producers Association (ASPAKI).",
        industries: [
          {
            name: "healthcare-equipment-and-supplies",
            subindustries: [
              {
                name: "healthcare-supplies-and-distributions",
              },
            ],
          },
          {
            name: "healthcare-providers",
            subindustries: [
              {
                name: "healthcare-providers",
              },
            ],
          },
        ],
      },
      {
        name: "pharmaceuticals-and-health-care-research",
        description:
          "The Pharmaceuticals & Health Care Research sector includes the production, distribution, and research of medicines, medical supplies, and healthcare products. The industry is regulated by the National Agency of Drug and Food Control (BPOM) and supported by organizations such as the Indonesian Pharmaceutical Association (IAI) and the Indonesian Medical Association (IDI).",
        industries: [
          {
            name: "pharmaceuticals",
            subindustries: [
              {
                name: "pharmaceuticals",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "industrials",
    subsectors: [
      {
        name: "industrial-goods",
        description:
          "The Industrial Goods sector is integral to Indonesia’s manufacturing and construction industries, providing machinery, tools, and equipment essential for production and infrastructure projects. Regulated by the Ministry of Industry (Kementerian Perindustrian), it ensures that Indonesia's industrial goods meet both domestic and global demands. The Indonesian Association of Heavy Equipment Manufacturers (IMME) plays a pivotal role in fostering collaboration, technical advancements, and promoting the growth of the heavy equipment industry.",
        industries: [
          {
            name: "building-products-and-fixtures",
            subindustries: [
              {
                name: "building-products-and-fixtures",
              },
            ],
          },
          {
            name: "electrical",
            subindustries: [
              {
                name: "electrical-components-and-equipment",
              },
            ],
          },
          {
            name: "machinery",
            subindustries: [
              {
                name: "construction-machinery-and-heavy-vehicles",
              },
              {
                name: "industrial-machinery-and-components",
              },
            ],
          },
        ],
      },
      {
        name: "industrial-services",
        description:
          "The Industrial Services sector in Indonesia provides essential support services like maintenance, repair, and operational assistance for industries such as manufacturing, energy, and construction. Regulated by the Ministry of Industry (Kementerian Perindustrian), the sector ensures high standards of safety, efficiency, and sustainability. The Indonesian Industrial Services Association (ASII) plays a key role in advancing technical expertise, promoting best practices, and fostering collaboration within the sector.",
        industries: [
          {
            name: "commercial-services",
            subindustries: [
              {
                name: "business-support-services",
              },
              {
                name: "commercial-printing",
              },
              {
                name: "environmental-and-facilities-services",
              },
              {
                name: "office-supplies",
              },
            ],
          },
          {
            name: "diversified-industrial-trading",
            subindustries: [
              {
                name: "diversified-industrial-trading",
              },
            ],
          },
          {
            name: "professional-services",
            subindustries: [
              {
                name: "human-resource-and-employment-services",
              },
              {
                name: "research-and-consulting-services",
              },
            ],
          },
        ],
      },
      {
        name: "multi-sector-holdings",
        description:
          "The Multi-sector Holdings sector consists of businesses operating across various industries, managing investments in sectors like banking, manufacturing, real estate, and consumer goods. These companies contribute to diversifying Indonesia's industrial landscape. The industry is regulated by the Financial Services Authority (OJK) and supported by organizations such as the Indonesian Chamber of Commerce and Industry (KADIN Indonesia).",
        industries: [
          {
            name: "multi-sector-holdings",
            subindustries: [
              {
                name: "multi-sector-holdings",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "infrastructures",
    subsectors: [
      {
        name: "heavy-constructions-and-civil-engineering",
        description:
          "The Heavy Construction & Civil Engineering sector focuses on the planning, development, and execution of large-scale infrastructure projects such as roads, bridges, airports, and public facilities. The industry is regulated by the Ministry of Public Works and Housing (PUPR) and supported by organizations such as the Indonesian Contractors Association (AKI) and the Indonesian Association of Construction Companies (GAPENSI).",
        industries: [
          {
            name: "heavy-constructions-and-civil-engineering",
            subindustries: [
              {
                name: "heavy-constructions-and-civil-engineering",
              },
            ],
          },
        ],
      },
      {
        name: "telecommunication",
        description:
          "The Telecommunication sector provides mobile, internet, and broadband services, ensuring digital connectivity for individuals and businesses across Indonesia. It includes mobile network operators, satellite communication, and fiber-optic services.",
        industries: [
          {
            name: "telecommunication-service",
            subindustries: [
              {
                name: "integrated-telecommunication-service",
              },
              {
                name: "wired-telecommunication-service",
              },
            ],
          },
          {
            name: "wireless-telecommunication-services",
            subindustries: [
              {
                name: "wireless-telecommunication-services",
              },
            ],
          },
        ],
      },
      {
        name: "transportation-infrastructure",
        description:
          "The Transportation Infrastructure sector involves the development, maintenance, and operation of transport facilities like highways, railways, seaports, and airports. Key infrastructure projects in Indonesia include the Trans-Java Toll Road, Soekarno-Hatta International Airport in Jakarta, and major seaports such as Tanjung Priok, all crucial for ensuring efficient movement of people and goods, supporting national connectivity.",
        industries: [
          {
            name: "transport-infrastructure-operator",
            subindustries: [
              {
                name: "airport-operators",
              },
              {
                name: "highways-and-railtracks",
              },
              {
                name: "marine-ports-and-services",
              },
            ],
          },
        ],
      },
      {
        name: "utilities",
        description:
          "The Utilities sector provides essential services like electricity, water, and natural gas to households, businesses, and industries. It ensures energy availability, water management, and sustainable infrastructure development and is regulated by the Ministry of Energy and Mineral Resources (ESDM).",
        industries: [
          {
            name: "electric-utilities",
            subindustries: [
              {
                name: "electric-utilities",
              },
            ],
          },
          {
            name: "gas-utilities",
            subindustries: [
              {
                name: "gas-utilities",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "properties-and-real-estate",
    subsectors: [
      {
        name: "properties-and-real-estate",
        description:
          "The Properties & Real Estate sector is responsible for the development, management, and sale of residential, commercial, and industrial properties. It includes housing projects, office buildings, retail spaces, and industrial zones, contributing to urban expansion and economic activities. The industry is regulated by the Ministry of Public Works and Housing (Kementrian PUPR) and supported by organizations like the Indonesian Real Estate Association (REI) to ensure growth and industry standards.",
        industries: [
          {
            name: "real-estate-management-and-development",
            subindustries: [
              {
                name: "real-estate-development-and-management",
              },
              {
                name: "real-estate-services",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "technology",
    subsectors: [
      {
        name: "software-and-it-services",
        description:
          "The Software & IT Services sector develops and provides software applications, IT consulting, cybersecurity solutions, and cloud-based services for businesses and individuals. In Indonesia, this sector is regulated by the Ministry of Communication and Informatics (Kementerian Komunikasi dan Informatika). A well-known non-profit organization in this sector is ICT Watch, which focuses on internet governance, digital rights, and cybersecurity awareness, working to educate the public and advocate for digital safety and inclusion.",
        industries: [
          {
            name: "it-services-and-consulting",
            subindustries: [
              {
                name: "it-services-and-consulting",
              },
            ],
          },
          {
            name: "online-applications-and-services",
            subindustries: [
              {
                name: "it-services-and-consulting",
              },
              {
                name: "online-applications-and-services",
              },
            ],
          },
          {
            name: "software",
            subindustries: [
              {
                name: "software",
              },
            ],
          },
        ],
      },
      {
        name: "technology-hardware-and-equipment",
        description:
          "The Technology Hardware & Equipment sector manufactures and supplies electronic devices, computer hardware, communication equipment, and industrial technology components. The industry is regulated by the Ministry of Industry and supported by organizations such as the Indonesian Electronics Producers Association (GABEL) and the Indonesian Telecommunication Society (MASTEL).",
        industries: [
          {
            name: "computer-hardware",
            subindustries: [
              {
                name: "computer-hardware",
              },
            ],
          },
          {
            name: "electronic-equipment-instruments-and-components",
            subindustries: [
              {
                name: "electronic-equipment-and-instruments",
              },
            ],
          },
          {
            name: "networking-equipment",
            subindustries: [
              {
                name: "networking-equipment",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "transportation-and-logistic",
    subsectors: [
      {
        name: "logistics-and-deliveries",
        description:
          "The Logistics & Deliveries sector drives the movement of goods across Indonesia’s archipelago, supporting retail, manufacturing, and e-commerce. This industry is regulated by the Ministry of Transportation (Kementrian Perhubungan) and supported by organizations like Indonesian Logistics and Forwarders Association and Indonesia National Single Window.",
        industries: [
          {
            name: "logistics-and-deliveries",
            subindustries: [
              {
                name: "logistics-and-deliveries",
              },
            ],
          },
        ],
      },
      {
        name: "transportation",
        description:
          "The Transportation sector includes public and private services that facilitate the movement of passengers and goods. It covers land, sea, and air transport, including buses, trains, airlines, and shipping services, ensuring connectivity across Indonesia's islands. The industry is regulated by the Ministry of Transportation and supported by organizations such as the Indonesian National Air Carrier Association (INACA), the Indonesian Shipping Association (INSA), and the Indonesian Bus Association (APTSI).",
        industries: [
          {
            name: "airlines",
            subindustries: [
              {
                name: "airlines",
              },
            ],
          },
          {
            name: "passenger-land-transportation",
            subindustries: [
              {
                name: "road-transportation",
              },
            ],
          },
        ],
      },
    ],
  },
];
