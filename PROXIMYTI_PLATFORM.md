# ProxiMyti Delivery Platform

> **Vermont's last-mile delivery service connecting local businesses with efficient logistics**

## 🎯 Platform Overview

**ProxiMyti** is a delivery service platform that serves local businesses and marketplaces like Myti.com. We provide the logistics infrastructure that keeps Vermont dollars circulating in local communities.

### **Business Model**
- **Service Provider**: ProxiMyti provides delivery services
- **Customers**: Myti.com marketplace + 73+ local Vermont vendors
- **Mission**: Efficient last-mile delivery that supports local economies

## 🏗️ Technical Architecture

### **Monorepo Structure** (Planned)
```
ProxiMyti/
├── services/                 # Backend services (Railway)
│   ├── monday-sync/         # Vendor management (this repo)
│   ├── order-management/    # Core delivery logic
│   ├── route-optimization/  # Delivery routing
│   └── notifications/       # SMS/Email service
├── apps/                    # Frontend applications (Vercel)
│   ├── admin-dashboard/     # Operations management
│   ├── driver-mobile/       # Driver PWA
│   ├── vendor-portal/       # Vendor self-service
│   └── customer-tracking/   # Order tracking
├── packages/                # Shared code
│   ├── database/           # Supabase schemas & migrations
│   ├── ui/                 # Shared components
│   └── types/              # TypeScript definitions
└── docs/                   # Documentation
    ├── api/                # API documentation
    ├── architecture/       # System diagrams
    └── deployment/         # DevOps guides
```

### **Data Infrastructure**
- **Primary Database**: Supabase (`circulate-vt` project)
- **Vendor Management**: Monday.com → Supabase sync (69 vendors active)
- **Real-time Updates**: Supabase real-time subscriptions
- **File Storage**: Supabase Storage (driver photos, receipts)

### **Deployment Strategy**
- **Railway**: Backend services, webhooks, background jobs
- **Vercel**: Frontend apps, static sites, edge functions
- **Supabase**: Database, auth, real-time, storage
- **GitHub**: Source control with automated CI/CD

## 🚛 Service Capabilities

### **Current Services** (MVP)
- ✅ **Vendor Sync**: Monday.com → Supabase integration (69 vendors)
- ✅ **Database Schema**: Vendors, contacts, service zones

### **Next Services** (Roadmap)
- 🔄 **Order Management**: Accept orders from Myti.com
- 🔄 **Route Optimization**: Efficient delivery routing
- 🔄 **Driver Dispatch**: Mobile driver experience
- 🔄 **Customer Tracking**: Real-time delivery updates

## 🎨 Brand Identity

### **Colors** (Shared with Myti brand guidelines)
- **ProxiMyti Green**: #005946 (primary)
- **ProxiMyti Orange**: #F57100 (CTAs)
- **ProxiMyti Yellow**: #EFA900 (accents)
- **ProxiMyti Pink**: #FF8084 (accents)

### **Value Proposition**
- **For Vendors**: "Focus on your business, we handle delivery"
- **For Customers**: "Local products, delivered efficiently"
- **For Communities**: "Keeping Vermont dollars in Vermont"

## 📊 Business Metrics

### **Current Scale**
- **69 active vendors** synced from Monday.com
- **61 vendor contacts** with full details
- **Service zones**: Chittenden Core, Extended, County-based

### **Economic Impact** (Projected)
- **$73 per $100** stays local vs $43 for chains
- **3x more jobs** created from local spending
- **Supporting 70+ Vermont businesses** with efficient delivery

## 🔗 Integration Points

### **Myti.com Integration**
- **Order Flow**: Myti.com → ProxiMyti → Delivery
- **Vendor Sync**: Monday.com manages vendor database
- **Brand Separation**: Myti.com (marketplace) + ProxiMyti (logistics)

### **External Services**
- **Monday.com**: Vendor CRM and data source
- **Supabase**: Core database and real-time features
- **Railway**: Backend service hosting
- **Vercel**: Frontend application hosting

---

## 🚀 Getting Started

### **For Developers**
1. Clone monorepo (when created)
2. Set up local Supabase instance
3. Configure environment variables
4. Run development services

### **For Vendors**
Visit: [vendor-portal-url] (when deployed)

### **For Operations**
Visit: [admin-dashboard-url] (when deployed)

---

*Building Vermont's delivery infrastructure, one route at a time* 🚛💚