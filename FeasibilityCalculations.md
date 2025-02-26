# Feasibility Calculations Documentation

## Overview

This document explains the feasibility calculation system used in the property development assessment tool. The system evaluates the financial viability of potential property developments based on various metrics, property characteristics, and market data.

## Data Sources

The feasibility calculations rely on several data sources:

1. **Property Data**: Information about the selected property, including:

   - Zone (e.g., R2)
   - Floor Space Ratio (FSR)
   - Height of Building (HOB)
   - Site area

2. **Construction Data**:

   - Construction costs per m² for different density types
   - Median dwelling sizes based on approved Development Applications (DAs)
   - Certificate counts for statistical reliability

3. **Sales Data**:
   - Recent property sales in the area
   - Filtered by property type and number of bedrooms
   - Used to determine median dwelling prices

## Density Types

The system calculates feasibility for two density types:

1. **Low-Mid Density**:

   - Includes: Dual Occupancy, Duplex/Semi-detached, House, Manor House, Terrace, Townhouse, Villa
   - Limited to a maximum of 3 storeys regardless of FSR or HOB values
   - Typically has a higher site efficiency ratio (60%)

2. **High Density**:
   - Includes: Apartment, Build-to-Rent, Shop Top Housing, Studio, Unit
   - Can utilize the full HOB allowance
   - Typically has a lower site efficiency ratio (40%)

## Calculation Process

### 1. Gross Floor Area (GFA) Calculation

#### What is GFA?

Gross Floor Area (GFA) is the total floor space available for development. It's a critical measure that determines how many dwellings can be built on a site.

#### How GFA is Calculated:

The system calculates the maximum allowable GFA based on two key constraints:

**FSR Constraint:**

- The Floor Space Ratio (FSR) is a planning control that limits how much floor area can be built relative to the site area
- We multiply the site area by the FSR to get the maximum GFA allowed under planning rules
- For example, a 1,000m² site with an FSR of 0.5 would allow 500m² of floor area

**Height Constraint:**

- The Height of Building (HOB) restriction limits how tall a building can be
- We first calculate how many storeys can fit within this height limit by dividing the HOB by the floor-to-floor height (typically 3.1m)
- For Low-Mid Density developments, we cap this at 3 storeys maximum
- We then calculate how much of the site can be covered by the building footprint (60% for Low-Mid Density, 40% for High Density)
- The GFA under height constraints is calculated by multiplying:
  - Site area × Site efficiency ratio × Number of storeys × GBA to GFA ratio
  - The GBA to GFA ratio (typically 90%) accounts for the fact that not all building area counts as floor area

**Final GFA:**

- The system uses the lower of these two constraints (FSR or Height)
- This ensures the development complies with both planning controls
- For Low-Mid Density, an additional check ensures the GFA doesn't exceed what would be possible with 3 storeys

### 2. Dwelling Metrics

#### Median Dwelling Size

The system calculates the typical size of dwellings based on real construction data:

- It focuses on properties with fewer than 4 bedrooms (0-3 bedrooms)
- For each bedroom count (0, 1, 2, and 3), it collects the dwelling sizes from approved Development Applications
- It then finds the median (middle value) of these sizes to determine a typical dwelling size
- If there's not enough data for specific bedroom counts, it falls back to an overall median for the density type
- This approach ensures the dwelling size reflects what's actually being built in the area

#### Median Dwelling Price

The system determines a realistic dwelling price based on recent sales:

- It filters sales data to match the density type (e.g., apartments for High Density)
- It excludes properties with more than 4 bedrooms to maintain consistency with the dwelling size calculation
- From these filtered sales, it finds the median price
- This median price represents what similar properties are actually selling for in the market
- Users can override this with their own price if they have specific market knowledge

### 3. Financial Metrics

The system uses several financial metrics that reflect real-world development costs and revenue:

- **Construction Cost**: The cost to build each square meter of floor area, based on actual construction data
- **Dwelling Price**: What each dwelling is expected to sell for, based on recent sales data
- **Agent's Sales Commission**: Typically 1.5-2.5% of the sales price
- **Legal Fees on Sales**: Typically 0.5-1% of the sales price
- **Marketing Costs**: Typically 0.5-1.5% of the sales price
- **Profit and Risk**: The target profit margin, typically 15-25% of total costs
- **DA Application Fees**: Fixed costs for submitting Development Applications
- **Development Contribution**: Fees paid to local government, typically 1% of construction costs
- **Professional Fees**: Architect, engineer, and consultant fees, typically 8-12% of construction costs
- **Interest Rate**: The cost of financing the project, applied to half the project costs over the project period
- **Project Period**: How long the development will take, typically 24 months for Low-Mid Density

### 4. Social and Affordable Housing Scenarios

The system can model the financial impact of including social and affordable housing:

- **Social Housing**: Units provided at no cost (0% of market revenue)
- **Affordable Housing**: Units provided at a discount (75% of market revenue)
- **Mixed Scenarios**: A combination of both social and affordable housing

By adjusting these percentages, users can see how different housing mixes affect overall feasibility.

## Feasibility Calculation

The final feasibility assessment combines all these factors to determine:

1. **Total Developable Area**: The maximum floor space that can be built (in square meters)
2. **Number of Dwellings**: How many units can fit in this space, calculated by dividing the GFA by the median dwelling size
3. **Total Revenue**: Number of dwellings × dwelling price, adjusted for any social/affordable housing
4. **Total Costs**: Sum of:
   - Construction costs (GFA × cost per square meter)
   - Sales costs (commissions, legal fees, marketing)
   - Development costs (DA fees, development contributions, professional fees)
   - Financing costs (interest on half the project costs over the project period)
5. **Profit**: Revenue minus Costs
6. **Profit Margin**: Profit as a percentage of costs

A development is generally considered feasible if the profit margin meets or exceeds the target (typically 15-25%).

## Customization

Users can customize various parameters to test different scenarios:

- Adjust building footprint percentages
- Modify floor-to-floor heights
- Change GBA to GFA ratios
- Override median dwelling prices
- Adjust financial metrics like fees and profit margins
- Test different social and affordable housing mixes

This flexibility allows for comprehensive feasibility testing across a wide range of development scenarios.

## Technical Implementation

The feasibility calculations are implemented in React components:

1. `FeasibilitySettings.jsx`: Manages user inputs and settings
2. `FeasibilityCalculation.jsx`: Performs the actual calculations and displays results

The system uses React state management to track changes and recalculate results dynamically as users adjust parameters.
