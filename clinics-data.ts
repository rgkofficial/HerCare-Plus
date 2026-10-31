// Complete verified clinics database for Jamshedpur & Bhagalpur

export type Clinic = {
  id: string;
  name: string;
  type: string;
  rating: number;
  reviews: number;
  phone: string;
  address: string;
  location: { lat: number; lng: number };
  fees: number;
  womenFriendly: boolean;
  specialties: string[];
  timings: string;
  emergency?: boolean;
  affordable?: boolean;
  womenOnly?: boolean;
};

export const CLINICS_DATA: { jamshedpur: Clinic[]; bhagalpur: Clinic[] } = {
  jamshedpur: [
    {
      id: "jsr-1",
      name: "Dr. Rajdeep Kour",
      type: "Gynecologist",
      rating: 4.9,
      reviews: 314,
      phone: "08460433965",
      address: "Steel City Clinic, Sonari, Jamshedpur - 831011",
      location: { lat: 22.7925, lng: 86.1842 },
      fees: 500,
      womenFriendly: true,
      specialties: ["High-risk pregnancy", "Gynecological surgeries"],
      timings: "Call for appointment"
    },
    {
      id: "jsr-2",
      name: "Dr. Anju Bajoria - Srishti & Drishti Clinic",
      type: "Gynecologist",
      rating: 4.8,
      reviews: 104,
      phone: "06572423581",
      address: "163, New Bardwari, Sakchi, Jamshedpur - 831001",
      location: { lat: 22.8046, lng: 86.2029 },
      fees: 500,
      womenFriendly: true,
      specialties: ["Normal delivery", "Laparoscopy", "Fibroid  treatment", "IUI"],
      timings: "Mon-Sat: 10am-2pm, 5pm-6:30pm"
    },
    {
      id: "jsr-3",
      name: "Dr. Veena Singh - Nu Life Nursing Home",
      type: "Gynecologist & Hospital",
      rating: 4.6,
      reviews: 188,
      phone: "08401446273",
      address: "HIG 263, New Housing Colony, Adityapur - 831013",
      location: { lat: 22.7980, lng: 86.1630 },
      fees: 500,
      womenFriendly: true,
      specialties: ["Infertility", "PCOS", "High-risk pregnancy", "STDs"],
      timings: "Mon-Sun: 9am-11am, 5pm-7pm"
    },
    {
      id: "jsr-4",
      name: "Tata Main Hospital",
      type: "Multi-specialty Hospital",
      rating: 4.5,
      reviews: 500,
      phone: "06576641011",
      address: "C Road West, Bistupur, Jamshedpur - 831001",
      location: { lat: 22.8056, lng: 86.1932 },
      fees: 800,
      womenFriendly: true,
      specialties: ["All gynecological services", "High-risk pregnancy", "24/7 Emergency"],
      timings: "24/7",
      emergency: true
    },
    {
      id: "jsr-5",
      name: "Brahmananda Narayana Hospital",
      type: "Multi-specialty Hospital",
      rating: 4.8,
      reviews: 10800,
      phone: "08061914444",
      address: "NH-33, Mango, Jamshedpur - 831012",
      location: { lat: 22.8317, lng: 86.2096 },
      fees: 1000,
      womenFriendly: true,
      specialties: ["Premium maternity care", "C-section", "Normal delivery"],
      timings: "24/7",
      emergency: true
    },
    {
      id: "jsr-6",
      name: "Jeevan Jyoti Hospital",
      type: "Multi-specialty Hospital",
      rating: 4.7,
      reviews: 148,
      phone: "08401437657",
      address: "Dimna Road, Mango, Jamshedpur - 831012",
      location: { lat: 22.8245, lng: 86.2134 },
      fees: 600,
      womenFriendly: true,
      specialties: ["Maternity", "Gynecology", "Pediatrics"],
      timings: "24/7",
      emergency: true
    },
    {
      id: "jsr-7",
      name: "Dr. Pinky Roy - Bindal Mall Clinic",
      type: "Gynecologist",
      rating: 4.7,
      reviews: 85,
      phone: "08092010573",
      address: "Bindal Mall, Marine Drive, Sonari - 831011",
      location: { lat: 22.7920, lng: 86.1875 },
      fees: 700,
      womenFriendly: true,
      specialties: ["C-section", "Menopause", "Infertility"],
      timings: "Mon-Sat: 10am-2pm"
    },
    {
      id: "jsr-8",
      name: "Kedia Eye and Maternity Centre",
      type: "Specialized Hospital",
      rating: 4.3,
      reviews: 120,
      phone: "Call via Justdial",
      address: "Ice Factory Complex, Jugsalai - 831006",
      location: { lat: 22.8015, lng: 86.1780 },
      fees: 500,
      womenFriendly: true,
      specialties: ["Maternity", "Gentle pregnancy care"],
      timings: "Call for appointment"
    }
  ],

  bhagalpur: [
    {
      id: "bhg-1",
      name: "Dr. Emrana Rehman - Rahman Clinic",
      type: "Gynecologist",
      rating: 4.7,
      reviews: 591,
      phone: "Call via Justdial",
      address: "Tilkamanjhi Barari Road, Tatarpur - 812002",
      location: { lat: 25.2425, lng: 87.0104 },
      fees: 300,
      womenFriendly: true,
      specialties: ["General gynecology", "Pregnancy care"],
      timings: "Call for appointment"
    },
    {
      id: "bhg-2",
      name: "Medaz Hospital",
      type: "Multi-specialty Hospital",
      rating: 4.6,
      reviews: 1185,
      phone: "08401322983",
      address: "Patna Bajrangpuri, Adampur - 812001",
      location: { lat: 25.2526, lng: 87.0043 },
      fees: 500,
      womenFriendly: true,
      specialties: ["Multi-specialty", "Maternity", "24/7 Emergency"],
      timings: "24/7",
      emergency: true
    },
    {
      id: "bhg-3",
      name: "Star Health Care Hospital",
      type: "Multi-specialty Hospital",
      rating: 4.7,
      reviews: 207,
      phone: "08735994318",
      address: "Sitla Sthan Road, Tilkamanjhi - 812001",
      location: { lat: 25.2445, lng: 87.0122 },
      fees: 500,
      womenFriendly: true,
      specialties: ["Excellent treatment", "Clean facilities", "24/7"],
      timings: "24/7",
      emergency: true
    },
    {
      id: "bhg-4",
      name: "Om Ent & Maternity Hospital",
      type: "Specialized Hospital",
      rating: 4.8,
      reviews: 135,
      phone: "08460455403",
      address: "Manik Sarkar Ghat Road - 812003",
      location: { lat: 25.2467, lng: 87.0056 },
      fees: 500,
      womenFriendly: true,
      specialties: ["Maternity", "ENT", "Patient comfort"],
      timings: "Call for appointment"
    },
    {
      id: "bhg-5",
      name: "JLNMCH (Government Hospital)",
      type: "Government Hospital",
      rating: 4.2,
      reviews: 779,
      phone: "06412300217",
      address: "Mayaganj, Bhagalpur",
      location: { lat: 25.2498, lng: 87.0012 },
      fees: 0,
      womenFriendly: true,
      specialties: ["Free/low-cost maternal care", "Emergency services"],
      timings: "24/7",
      emergency: true,
      affordable: true
    },
    {
      id: "bhg-6",
      name: "AKSHARAM HOSPITAL",
      type: "Multi-specialty Hospital",
      rating: 4.9,
      reviews: 37,
      phone: "Call via Justdial",
      address: "Goradih Road, Sarmaspur - 812002",
      location: { lat: 25.2411, lng: 87.0078 },
      fees: 400,
      womenFriendly: true,
      specialties: ["High standard care", "Gentle staff", "Organized"],
      timings: "Call for appointment"
    },
    {
      id: "bhg-7",
      name: "Sri Ram Hospital",
      type: "Multi-specialty Hospital",
      rating: 4.1,
      reviews: 116,
      phone: "08128851752",
      address: "Gurunanakpur, Zero Mile - 813210",
      location: { lat: 25.2387, lng: 87.0234 },
      fees: 500,
      womenFriendly: true,
      specialties: ["General healthcare", "Maternity"],
      timings: "Call for appointment"
    },
    {
      id: "bhg-8",
      name: "Rani Women's Hospital",
      type: "Women-Only Hospital",
      rating: 4.5,
      reviews: 90,
      phone: "Call via Justdial",
      address: "MG Road, Opposite Post Office - 812001",
      location: { lat: 25.2489, lng: 87.0098 },
      fees: 600,
      womenFriendly: true,
      specialties: ["Women-exclusive hospital", "Complete privacy"],
      timings: "Call for appointment",
      womenOnly: true
    },
    {
      id: "bhg-9",
      name: "Supreety Clinic",
      type: "Women's Health Clinic",
      rating: 4.8,
      reviews: 18,
      phone: "09972271086",
      address: "Lalkothi, Tatarpur - 812002",
      location: { lat: 25.2432, lng: 87.0089 },
      fees: 300,
      womenFriendly: true,
      specialties: ["Affordable care", "Good treatment", "Supportive staff"],
      timings: "Call for appointment",
      affordable: true
    }
  ]
};
