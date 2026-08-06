import React from 'react';
import { ProductId } from '../types';
import { DebriefDataset } from '../hooks/useDebriefData';

import { TitleSlide } from '../pages/debrief/slides/TitleSlide';
import { SectionSlide } from '../pages/debrief/slides/SectionSlide';
import { TotalRevenueSlide } from '../pages/debrief/slides/TotalRevenueSlide';
import { RevenueByProductSlide } from '../pages/debrief/slides/RevenueByProductSlide';
import { RevenueMixSlide } from '../pages/debrief/slides/RevenueMixSlide';
import { GrossProfitSlide } from '../pages/debrief/slides/GrossProfitSlide';
import { ProductRevenueSlide } from '../pages/debrief/slides/ProductRevenueSlide';
import { ProductShareSlide } from '../pages/debrief/slides/ProductShareSlide';
import { ProductPlanVsActualSlide } from '../pages/debrief/slides/ProductPlanVsActualSlide';
import { ProductValuePriceSlide } from '../pages/debrief/slides/ProductValuePriceSlide';
import { OpexSlide } from '../pages/debrief/slides/OpexSlide';
import { EmployeeUtilisationSlide } from '../pages/debrief/slides/EmployeeUtilisationSlide';
import { CustomerSatisfactionSlide } from '../pages/debrief/slides/CustomerSatisfactionSlide';
import { EmployeeSatisfactionSlide } from '../pages/debrief/slides/EmployeeSatisfactionSlide';
import { LeagueCurrentSlide } from '../pages/debrief/slides/LeagueCurrentSlide';
import { LeagueOverallSlide } from '../pages/debrief/slides/LeagueOverallSlide';

export interface SlideDefinition {
  id: string;
  title: string;
  maxRevealSteps: number;
  render: (props: {
    dataset: DebriefDataset;
    revealStep: number;
    currentSlide: number;
    totalSlides: number;
  }) => React.ReactElement;
}

export function compileDebriefSlides(dataset: DebriefDataset): SlideDefinition[] {
  const products: { id: ProductId; name: string }[] = [
    { id: 'techbook', name: 'TechBook' },
    { id: 'zroid', name: 'Zroid' },
    { id: 'itab', name: 'iTab' }
  ];

  const slides: SlideDefinition[] = [];

  // 1. Title Slide
  slides.push({
    id: 'title',
    title: `${dataset.className} · Year ${dataset.period}`,
    maxRevealSteps: 0,
    render: (p) => <TitleSlide className={p.dataset.className} period={p.dataset.period} />
  });

  // 2. Total Revenue per team
  slides.push({
    id: 'total-revenue',
    title: 'Total Revenue per Team',
    maxRevealSteps: 3,
    render: (p) => <TotalRevenueSlide {...p} />
  });

  // 3. Revenue per product per team
  slides.push({
    id: 'revenue-by-product',
    title: 'Revenue per Product by Team',
    maxRevealSteps: 1,
    render: (p) => <RevenueByProductSlide {...p} />
  });

  // 4. Revenue mix (%)
  slides.push({
    id: 'revenue-mix',
    title: 'Revenue Contribution per Product (%)',
    maxRevealSteps: 1,
    render: (p) => <RevenueMixSlide {...p} />
  });

  // 5. Gross Profit (R)
  slides.push({
    id: 'gross-profit',
    title: 'Gross Profit & Margin',
    maxRevealSteps: 1,
    render: (p) => <GrossProfitSlide {...p} />
  });

  // Product slides (TechBook, Zroid, iTab)
  products.forEach(prod => {
    // Section slide
    slides.push({
      id: `section-${prod.id}`,
      title: prod.name,
      maxRevealSteps: 0,
      render: () => <SectionSlide sectionTitle={prod.name} subtitle={`Product Market Analysis for ${prod.name}`} />
    });

    // Revenue per product
    slides.push({
      id: `revenue-${prod.id}`,
      title: `Revenue: ${prod.name}`,
      maxRevealSteps: 1,
      render: (p) => <ProductRevenueSlide productId={prod.id} productName={prod.name} {...p} />
    });

    // Market Share per product
    slides.push({
      id: `share-${prod.id}`,
      title: `Actual Market Share: ${prod.name}`,
      maxRevealSteps: 1,
      render: (p) => <ProductShareSlide productId={prod.id} productName={prod.name} {...p} />
    });

    // Plan vs Actual per product
    slides.push({
      id: `plan-vs-actual-${prod.id}`,
      title: `Plan vs Actual: ${prod.name}`,
      maxRevealSteps: 2,
      render: (p) => <ProductPlanVsActualSlide productId={prod.id} productName={prod.name} {...p} />
    });

    // Value vs Price per product
    slides.push({
      id: `value-price-${prod.id}`,
      title: `Value vs Price: ${prod.name}`,
      maxRevealSteps: 2,
      render: (p) => <ProductValuePriceSlide productId={prod.id} productName={prod.name} {...p} />
    });
  });

  // 21. Operations Section
  slides.push({
    id: 'section-operations',
    title: 'Operations',
    maxRevealSteps: 0,
    render: () => <SectionSlide sectionTitle="Operations & Human Resources" subtitle="Operating Expenses, Service Quality & Satisfaction" />
  });

  // 22. Operating Expenses
  slides.push({
    id: 'opex',
    title: 'Operating Expenses',
    maxRevealSteps: 1,
    render: (p) => <OpexSlide {...p} />
  });

  // 23. Employee Utilisation
  slides.push({
    id: 'employee-utilisation',
    title: 'Employee Capacity & Utilisation (%)',
    maxRevealSteps: 1,
    render: (p) => <EmployeeUtilisationSlide {...p} />
  });

  // 24. Customer Satisfaction
  slides.push({
    id: 'csat',
    title: 'Customer Satisfaction (CSAT)',
    maxRevealSteps: 1,
    render: (p) => <CustomerSatisfactionSlide {...p} />
  });

  // 25. Employee Satisfaction
  slides.push({
    id: 'esat',
    title: 'Employee Satisfaction (ESAT)',
    maxRevealSteps: 1,
    render: (p) => <EmployeeSatisfactionSlide {...p} />
  });

  // 26. League Table Section
  slides.push({
    id: 'section-league',
    title: 'League Table',
    maxRevealSteps: 0,
    render: () => <SectionSlide sectionTitle="League Standings & Winners" subtitle="Year-End Results & Cumulative Championship" />
  });

  // 27. League Current
  slides.push({
    id: 'league-current',
    title: 'League Standings: Current Year',
    maxRevealSteps: dataset.teams.length,
    render: (p) => <LeagueCurrentSlide {...p} />
  });

  // 28. League Overall
  slides.push({
    id: 'league-overall',
    title: 'Cumulative League Leaderboard',
    maxRevealSteps: 1,
    render: (p) => <LeagueOverallSlide {...p} />
  });

  return slides;
}
