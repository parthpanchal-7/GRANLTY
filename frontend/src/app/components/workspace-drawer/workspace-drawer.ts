import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { GrantlyStore, StudentSubTab } from '../../core/grantly-store';
import {
  PortalMode,
  ScholarshipApplication,
  ScholarshipScheme,
  SocialCategory,
  formatCourseLevel,
  formatInr,
} from '../../core/scholarship-rules';

@Component({
  selector: 'app-workspace-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    @if (store.activePortal(); as portal) {
      <div
        class="fixed inset-0 z-50 flex flex-col bg-[#F4F6FA]/95 backdrop-blur-md overflow-hidden animate-fadeIn"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="portalTitle(portal)"
      >
        <!-- Workspace Top Bar -->
        <header class="flex items-center justify-between gap-4 px-6 py-4 bg-white border-b border-[#DCE2EE] shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <span class="font-mono-tabular text-xs font-semibold uppercase tracking-wider text-[#2B44FF] whitespace-nowrap shrink-0">
              {{ portalCode(portal) }}
            </span>
            <span class="text-[#DCE2EE] shrink-0" aria-hidden="true">/</span>
            <h2 class="font-display text-base font-bold text-[#0D0F17] whitespace-nowrap truncate">
              {{ portalTitle(portal) }}
            </h2>
          </div>

          <!-- Portal Switcher Segmented Controls -->
          <div class="flex items-center gap-1 p-1 bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl">
            <button
              type="button"
              (click)="store.openPortal('STUDENT')"
              [class]="
                portal === 'STUDENT'
                  ? 'px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#2B44FF] text-white shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer'
                  : 'px-3.5 py-1.5 text-xs font-medium rounded-lg text-[#5A6275] hover:text-[#0D0F17] transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer'
              "
            >
              <mat-icon class="!text-sm !w-4 !h-4 leading-none">school</mat-icon>
              <span>Student Portal</span>
            </button>
            <button
              type="button"
              (click)="store.openPortal('INSTITUTE')"
              [class]="
                portal === 'INSTITUTE'
                  ? 'px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#2B44FF] text-white shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer'
                  : 'px-3.5 py-1.5 text-xs font-medium rounded-lg text-[#5A6275] hover:text-[#0D0F17] transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer'
              "
            >
              <mat-icon class="!text-sm !w-4 !h-4 leading-none">account_balance</mat-icon>
              <span>Institute Nodal Officer (INO)</span>
            </button>
            <button
              type="button"
              (click)="store.openPortal('MINISTRY')"
              [class]="
                portal === 'MINISTRY'
                  ? 'px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#2B44FF] text-white shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer'
                  : 'px-3.5 py-1.5 text-xs font-medium rounded-lg text-[#5A6275] hover:text-[#0D0F17] transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer'
              "
            >
              <mat-icon class="!text-sm !w-4 !h-4 leading-none">gavel</mat-icon>
              <span>Scheme &amp; Ministry Portal</span>
            </button>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              (click)="store.closePortal()"
              class="px-4 py-2 text-xs font-semibold text-[#0D0F17] bg-[#F4F6FA] hover:bg-[#E2E8F0] border border-[#DCE2EE] rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <mat-icon class="!text-base !w-4 !h-4 leading-none">close</mat-icon>
              <span>Return to Daylight Spine</span>
            </button>
          </div>
        </header>

        <!-- Action Notification Bar -->
        @if (store.actionNotice(); as notice) {
          <div
            class="px-6 py-2.5 bg-white border-b border-[#DCE2EE] flex items-center justify-between text-xs shrink-0"
          >
            <div class="flex items-center gap-2.5">
              <mat-icon
                class="!text-base !w-4 !h-4 leading-none"
                [class.text-[#2B44FF]]="notice.tone === 'cobalt'"
                [class.text-emerald-600]="notice.tone === 'emerald'"
                [class.text-amber-600]="notice.tone === 'amber'"
              >
                verified
              </mat-icon>
              <span class="font-semibold text-[#0D0F17]">{{ notice.title }}</span>
              <span class="text-[#5A6275]" aria-hidden="true">·</span>
              <span class="text-[#5A6275]">{{ notice.detail }}</span>
            </div>
            <button
              type="button"
              (click)="store.actionNotice.set(null)"
              class="text-[#5A6275] hover:text-[#0D0F17] font-medium cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        }

        <!-- Main Scrollable Workspace Viewport -->
        <div class="flex-1 overflow-y-auto px-6 py-6">
          <div class="max-w-7xl mx-auto">
            <!-- ========================================================= -->
            <!-- 1. STUDENT PORTAL WORKSPACE                               -->
            <!-- ========================================================= -->
            @if (portal === 'STUDENT') {
              <!-- Student Sub-Navigation & OTR Summary Bar -->
              <div class="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-[#DCE2EE]">
                <div class="flex flex-wrap items-center gap-2">
                  @for (tab of studentTabs; track tab.id) {
                    <button
                      type="button"
                      (click)="store.studentSubTab.set(tab.id)"
                      [class]="
                        store.studentSubTab() === tab.id
                          ? 'px-4 py-2 text-xs font-semibold rounded-xl bg-[#0D0F17] text-white flex items-center gap-2 whitespace-nowrap cursor-pointer'
                          : 'px-4 py-2 text-xs font-medium rounded-xl bg-white text-[#5A6275] border border-[#DCE2EE] hover:text-[#0D0F17] flex items-center gap-2 whitespace-nowrap cursor-pointer'
                      "
                    >
                      <mat-icon class="!text-sm !w-4 !h-4 leading-none">{{ tab.icon }}</mat-icon>
                      <span>{{ tab.label }}</span>
                      @if (tab.id === 'KANBAN' && defectiveCount() > 0) {
                        <span class="font-mono-tabular text-[11px] text-amber-300">
                          ({{ defectiveCount() }} Action Req)
                        </span>
                      }
                    </button>
                  }
                </div>

                <!-- OTR Telemetry Readout -->
                <div class="flex items-center gap-4 text-xs text-[#5A6275] bg-white px-4 py-2.5 rounded-xl border border-[#DCE2EE]">
                  <div>
                    <span class="text-[#5A6275]">OTR ID: </span>
                    <span class="font-mono-tabular font-semibold text-[#0D0F17]">
                      {{ store.studentProfile().otrId }}
                    </span>
                  </div>
                  <span aria-hidden="true">·</span>
                  <div>
                    <span class="text-[#5A6275]">Marks: </span>
                    <span class="font-mono-tabular font-semibold text-[#0D0F17]">
                      {{ store.studentProfile().academicPercentage }}%
                    </span>
                  </div>
                  <span aria-hidden="true">·</span>
                  <div>
                    <span class="text-[#5A6275]">Income: </span>
                    <span class="font-mono-tabular font-semibold text-[#0D0F17]">
                      {{ formatInr(store.studentProfile().familyIncome) }}
                    </span>
                  </div>
                  <span aria-hidden="true">·</span>
                  <div>
                    <span class="font-mono-tabular font-semibold text-[#2B44FF]">
                      {{ store.eligibilityBreakdown().eligible }} / {{ store.eligibilityBreakdown().total }} Eligible
                    </span>
                  </div>
                </div>
              </div>

              <!-- SUB-TAB A: UNSTOP SCHOLARSHIP BROWSER -->
              @if (store.studentSubTab() === 'BROWSER') {
                <div class="space-y-6">
                  <!-- Filter & Breakdown Bar -->
                  <div class="bg-white p-5 rounded-2xl border border-[#DCE2EE] space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div class="md:col-span-5">
                        <label for="scheme-search" class="block text-xs font-medium text-[#5A6275] mb-1.5">
                          Search Scholarships by Title, Ministry, or Code
                        </label>
                        <div class="relative">
                          <input
                            id="scheme-search"
                            type="text"
                            [value]="searchQuery()"
                            (input)="onSearchInput($event)"
                            placeholder="e.g. PM-USP, AICTE Pragati, STEM, UGC..."
                            class="w-full px-3.5 py-2 text-sm bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17] focus:outline-none focus:border-[#2B44FF]"
                          />
                        </div>
                      </div>

                      <div class="md:col-span-3">
                        <label for="provider-filter" class="block text-xs font-medium text-[#5A6275] mb-1.5">
                          Sponsoring Authority
                        </label>
                        <select
                          id="provider-filter"
                          [value]="providerFilter()"
                          (change)="onProviderChange($event)"
                          class="w-full px-3 py-2 text-sm bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17] focus:outline-none focus:border-[#2B44FF]"
                        >
                          <option value="ALL">All Authorities</option>
                          <option value="Central Govt">Central Govt Ministries</option>
                          <option value="AICTE / UGC">AICTE / UGC Statutory</option>
                          <option value="Corporate CSR">Corporate CSR Endowments</option>
                        </select>
                      </div>

                      <div class="md:col-span-4">
                        <span class="block text-xs font-medium text-[#5A6275] mb-1.5">
                          Live Eligibility Filter
                        </span>
                        <div class="flex items-center gap-1 p-1 bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl">
                          <button
                            type="button"
                            (click)="statusFilter.set('ALL')"
                            [class]="
                              statusFilter() === 'ALL'
                                ? 'flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg bg-white text-[#0D0F17] shadow-2xs cursor-pointer whitespace-nowrap'
                                : 'flex-1 py-1.5 px-2 text-xs font-medium text-[#5A6275] hover:text-[#0D0F17] cursor-pointer whitespace-nowrap'
                            "
                          >
                            All ({{ store.eligibilityBreakdown().total }})
                          </button>
                          <button
                            type="button"
                            (click)="statusFilter.set('ELIGIBLE')"
                            [class]="
                              statusFilter() === 'ELIGIBLE'
                                ? 'flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg bg-white text-emerald-700 shadow-2xs cursor-pointer whitespace-nowrap'
                                : 'flex-1 py-1.5 px-2 text-xs font-medium text-[#5A6275] hover:text-[#0D0F17] cursor-pointer whitespace-nowrap'
                            "
                          >
                            100% Eligible ({{ store.eligibilityBreakdown().eligible }})
                          </button>
                          <button
                            type="button"
                            (click)="statusFilter.set('DOC_MISSING')"
                            [class]="
                              statusFilter() === 'DOC_MISSING'
                                ? 'flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg bg-white text-amber-700 shadow-2xs cursor-pointer whitespace-nowrap'
                                : 'flex-1 py-1.5 px-2 text-xs font-medium text-[#5A6275] hover:text-[#0D0F17] cursor-pointer whitespace-nowrap'
                            "
                          >
                            Missing Doc ({{ store.eligibilityBreakdown().docMissing }})
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Filtered Schemes Grid -->
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    @for (scheme of filteredBrowserSchemes(); track scheme.id) {
                      @let evalResult = store.schemeEvaluations().get(scheme.id);
                      <article
                        class="bg-white rounded-2xl border border-[#DCE2EE] p-6 flex flex-col justify-between gap-5 hover:border-[#2B44FF]/50 transition-colors"
                      >
                        <div class="space-y-3">
                          <!-- Unboxed Metadata Line -->
                          <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5A6275]">
                            <div class="flex items-center gap-2 font-mono-tabular">
                              <span class="font-semibold text-[#2B44FF]">{{ scheme.code }}</span>
                              <span aria-hidden="true">·</span>
                              <span>{{ scheme.providerType }}</span>
                              <span aria-hidden="true">·</span>
                              <span>Closes in {{ scheme.deadlineDays }}d</span>
                            </div>
                            @if (evalResult) {
                              <div class="font-mono-tabular font-semibold">
                                @if (evalResult.status === 'ELIGIBLE') {
                                  <span class="text-emerald-700">100% ELIGIBLE MATCH</span>
                                } @else if (evalResult.status === 'DOC_MISSING') {
                                  <span class="text-amber-700">
                                    DOCUMENT MISSING ({{ evalResult.matchPercent }}%)
                                  </span>
                                } @else {
                                  <span class="text-rose-700">
                                    INELIGIBLE ({{ evalResult.matchPercent }}%)
                                  </span>
                                }
                              </div>
                            }
                          </div>

                          <h3 class="font-display text-lg font-bold text-[#0D0F17] leading-snug">
                            {{ scheme.title }}
                          </h3>
                          <p class="text-xs text-[#5A6275]">
                            {{ scheme.ministry }} · {{ scheme.tags.join(' · ') }}
                          </p>

                          <!-- Financial & Criteria Strip -->
                          <div class="grid grid-cols-3 gap-4 pt-3 border-t border-[#DCE2EE]">
                            <div>
                              <span class="block text-[11px] text-[#5A6275]">Annual Grant</span>
                              <span class="font-mono-tabular text-base font-bold text-[#0D0F17]">
                                {{ formatInr(scheme.annualAward) }}
                              </span>
                            </div>
                            <div>
                              <span class="block text-[11px] text-[#5A6275]">Income Ceiling</span>
                              <span class="font-mono-tabular text-sm font-semibold text-[#0D0F17]">
                                &le; {{ formatInr(scheme.maxFamilyIncome) }}
                              </span>
                            </div>
                            <div>
                              <span class="block text-[11px] text-[#5A6275]">Min Marks &amp; Quota</span>
                              <span class="font-mono-tabular text-sm font-semibold text-[#0D0F17]">
                                {{ scheme.minPercentage }}% · {{ scheme.totalSeats.toLocaleString('en-IN') }} seats
                              </span>
                            </div>
                          </div>

                          <!-- Expandable "Why am I (in)eligible?" Rule Breakdown -->
                          @if (expandedExplainId() === scheme.id && evalResult) {
                            <div class="mt-3 pt-3 border-t border-[#DCE2EE] space-y-2 bg-[#F4F6FA] p-3.5 rounded-xl">
                              <div class="flex items-center justify-between text-xs font-semibold text-[#0D0F17]">
                                <span>Automated OTR Rule Checklist</span>
                                <span class="font-mono-tabular text-[#2B44FF]">
                                  {{ evalResult.matchPercent }}% Match
                                </span>
                              </div>
                              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                @for (check of evalResult.checks; track check.criterion) {
                                  <div class="flex items-start gap-2 text-xs">
                                    <mat-icon
                                      class="!text-sm !w-4 !h-4 leading-none shrink-0 mt-0.5"
                                      [class.text-emerald-600]="check.passed"
                                      [class.text-rose-600]="!check.passed"
                                    >
                                      {{ check.passed ? 'check_circle' : 'cancel' }}
                                    </mat-icon>
                                    <div>
                                      <div class="font-medium text-[#0D0F17]">{{ check.criterion }}</div>
                                      <div class="text-[11px] text-[#5A6275]">{{ check.detail }}</div>
                                    </div>
                                  </div>
                                }
                              </div>
                            </div>
                          }
                        </div>

                        <!-- Card Actions -->
                        <div class="flex items-center justify-between gap-3 pt-3 border-t border-[#DCE2EE]">
                          <button
                            type="button"
                            (click)="toggleExplain(scheme.id)"
                            class="text-xs font-semibold text-[#5A6275] hover:text-[#0D0F17] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <mat-icon class="!text-sm !w-4 !h-4 leading-none">
                              {{ expandedExplainId() === scheme.id ? 'expand_less' : 'fact_check' }}
                            </mat-icon>
                            <span>
                              {{ expandedExplainId() === scheme.id ? 'Hide Eligibility Audit' : 'Why am I eligible?' }}
                            </span>
                          </button>

                          <div class="flex items-center gap-2">
                            @if (evalResult?.status === 'DOC_MISSING') {
                              <button
                                type="button"
                                (click)="store.studentSubTab.set('DOSSIER')"
                                class="px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                              >
                                <mat-icon class="!text-sm !w-4 !h-4 leading-none">upload_file</mat-icon>
                                <span>Upload Missing Doc</span>
                              </button>
                            }
                            <button
                              type="button"
                              [attr.data-testid]="'browser-apply-' + scheme.id"
                              (click)="openApplyWizard(scheme)"
                              class="px-4 py-2 text-xs font-semibold text-white bg-[#2B44FF] hover:bg-[#1E36E0] rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <mat-icon class="!text-sm !w-4 !h-4 leading-none">send</mat-icon>
                              <span>{{ store.isStudentSignedIn() ? 'Apply via OTR' : 'Sign In to Apply' }}</span>
                            </button>
                          </div>
                        </div>
                      </article>
                    } @empty {
                      <div class="col-span-full bg-white rounded-2xl border border-[#DCE2EE] p-10 text-center space-y-3">
                        <p class="font-display text-base font-bold text-[#0D0F17]">
                          No scholarship schemes match your current filter criteria.
                        </p>
                        <p class="text-xs text-[#5A6275]">
                          Reset the search filter or adjust your OTR Profile attributes to discover matching schemes.
                        </p>
                        <button
                          type="button"
                          (click)="resetBrowserFilters()"
                          class="px-4 py-2 text-xs font-semibold text-white bg-[#2B44FF] rounded-xl cursor-pointer"
                        >
                          Reset Discovery Filters
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- SUB-TAB B: OTR PROFILE & AADHAAR e-KYC EDITOR -->
              @if (store.studentSubTab() === 'OTR_PROFILE') {
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div class="lg:col-span-8 bg-white rounded-2xl border border-[#DCE2EE] p-6 space-y-5">
                    <div class="flex items-center justify-between border-b border-[#DCE2EE] pb-4">
                      <div>
                        <h3 class="font-display text-lg font-bold text-[#0D0F17]">
                          One-Time Registration (OTR) &amp; Academic Profile
                        </h3>
                        <p class="text-xs text-[#5A6275]">
                          Modifying your percentage, income, or category immediately recalculates your eligibility across all schemes.
                        </p>
                      </div>
                      <button
                        type="button"
                        (click)="store.regenerateOtrId()"
                        class="px-3.5 py-2 text-xs font-semibold text-[#2B44FF] bg-[#F4F6FA] hover:bg-[#E2E8F0] border border-[#DCE2EE] rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <mat-icon class="!text-sm !w-4 !h-4 leading-none">autorenew</mat-icon>
                        <span>Re-issue OTR ID</span>
                      </button>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label for="otr-fullname" class="block text-xs font-medium text-[#5A6275] mb-1">
                          Candidate Full Name (As per Aadhaar)
                        </label>
                        <input
                          id="otr-fullname"
                          type="text"
                          [value]="store.studentProfile().fullName"
                          (input)="updateProfileField('fullName', $any($event.target).value)"
                          class="w-full px-3.5 py-2 text-sm bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                        />
                      </div>

                      <div>
                        <label for="otr-category" class="block text-xs font-medium text-[#5A6275] mb-1">
                          Social Category / Quota
                        </label>
                        <select
                          id="otr-category"
                          [value]="store.studentProfile().category"
                          (change)="updateProfileField('category', $any($event.target).value)"
                          class="w-full px-3.5 py-2 text-sm bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                        >
                          @for (cat of allCategories; track cat) {
                            <option [value]="cat">{{ cat }}</option>
                          }
                        </select>
                      </div>

                      <div>
                        <label for="otr-marks" class="block text-xs font-medium text-[#5A6275] mb-1">
                          Last Qualifying Exam Percentage (%)
                        </label>
                        <input
                          id="otr-marks"
                          type="number"
                          min="40"
                          max="100"
                          step="0.5"
                          [value]="store.studentProfile().academicPercentage"
                          (input)="updateProfileNumber('academicPercentage', $any($event.target).value)"
                          class="w-full px-3.5 py-2 text-sm font-mono-tabular bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                        />
                      </div>

                      <div>
                        <label for="otr-income" class="block text-xs font-medium text-[#5A6275] mb-1">
                          Annual Family Income (INR)
                        </label>
                        <input
                          id="otr-income"
                          type="number"
                          min="50000"
                          max="1200000"
                          step="10000"
                          [value]="store.studentProfile().familyIncome"
                          (input)="updateProfileNumber('familyIncome', $any($event.target).value)"
                          class="w-full px-3.5 py-2 text-sm font-mono-tabular bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                        />
                      </div>

                      <div>
                        <label for="otr-course" class="block text-xs font-medium text-[#5A6275] mb-1">
                          Current Course Level
                        </label>
                        <select
                          id="otr-course"
                          [value]="store.studentProfile().courseLevel"
                          (change)="updateProfileField('courseLevel', $any($event.target).value)"
                          class="w-full px-3.5 py-2 text-sm bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                        >
                          <option value="UG_STEM">B.Tech / B.E. / B.Sc (STEM)</option>
                          <option value="UG_ARTS_COMMERCE">B.A. / B.Com / BBA (UG)</option>
                          <option value="PG_MASTERS">M.Tech / M.Sc / MBA (PG)</option>
                          <option value="DOCTORAL_RESEARCH">Ph.D. / Doctoral Fellowship</option>
                        </select>
                      </div>

                      <div>
                        <label for="otr-state" class="block text-xs font-medium text-[#5A6275] mb-1">
                          Domicile State
                        </label>
                        <input
                          id="otr-state"
                          type="text"
                          [value]="store.studentProfile().state"
                          (input)="updateProfileField('state', $any($event.target).value)"
                          class="w-full px-3.5 py-2 text-sm bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Aadhaar e-KYC & NPCI Bank Seeding Controls -->
                  <div class="lg:col-span-4 bg-white rounded-2xl border border-[#DCE2EE] p-6 space-y-5">
                    <h3 class="font-display text-lg font-bold text-[#0D0F17] border-b border-[#DCE2EE] pb-4">
                      UIDAI e-KYC &amp; NPCI DBT Seeding
                    </h3>

                    <div class="space-y-4">
                      <div class="p-4 rounded-xl bg-[#F4F6FA] border border-[#DCE2EE] flex items-center justify-between gap-3">
                        <div>
                          <div class="text-xs font-semibold text-[#0D0F17]">Aadhaar Face / OTP e-KYC</div>
                          <div class="text-[11px] text-[#5A6275]">
                            {{ store.studentProfile().aadhaarEkyc ? 'Verified with UIDAI Vault' : 'e-KYC Pending' }}
                          </div>
                        </div>
                        <button
                          type="button"
                          (click)="toggleKycField('aadhaarEkyc')"
                          [class]="
                            store.studentProfile().aadhaarEkyc
                              ? 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white cursor-pointer whitespace-nowrap'
                              : 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white cursor-pointer whitespace-nowrap'
                          "
                        >
                          {{ store.studentProfile().aadhaarEkyc ? 'Active' : 'Enable e-KYC' }}
                        </button>
                      </div>

                      <div class="p-4 rounded-xl bg-[#F4F6FA] border border-[#DCE2EE] flex items-center justify-between gap-3">
                        <div>
                          <div class="text-xs font-semibold text-[#0D0F17]">NPCI Aadhaar Bank Mapper</div>
                          <div class="text-[11px] font-mono-tabular text-[#5A6275]">
                            {{ store.studentProfile().bankAccountMasked }}
                          </div>
                        </div>
                        <button
                          type="button"
                          (click)="toggleKycField('dbtSeeded')"
                          [class]="
                            store.studentProfile().dbtSeeded
                              ? 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white cursor-pointer whitespace-nowrap'
                              : 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white cursor-pointer whitespace-nowrap'
                          "
                        >
                          {{ store.studentProfile().dbtSeeded ? 'Seeded' : 'Seed Account' }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              }

              <!-- SUB-TAB C: SMART DOSSIER (DOCUMENT LOCKER WITH 1-CLICK OCR) -->
              @if (store.studentSubTab() === 'DOSSIER') {
                <div class="bg-white rounded-2xl border border-[#DCE2EE] p-6 space-y-5">
                  <div class="flex flex-wrap items-center justify-between gap-4 border-b border-[#DCE2EE] pb-4">
                    <div>
                      <h3 class="font-display text-lg font-bold text-[#0D0F17]">
                        Smart Dossier — DigiLocker &amp; OCR Certificate Vault
                      </h3>
                      <p class="text-xs text-[#5A6275]">
                        Click "1-Click OCR Upload &amp; Verify" on any pending certificate to extract metadata and unlock 100% scheme eligibility.
                      </p>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    @for (doc of store.documents(); track doc.id) {
                      <div class="p-5 rounded-xl bg-[#F4F6FA] border border-[#DCE2EE] flex flex-col justify-between gap-4">
                        <div class="space-y-2">
                          <div class="flex items-center justify-between text-xs">
                            <span class="font-mono-tabular font-semibold text-[#2B44FF]">{{ doc.type }}</span>
                            @if (doc.verifiedOcr) {
                              <span class="font-mono-tabular font-semibold text-emerald-700">
                                OCR VERIFIED · {{ doc.certificateNo }}
                              </span>
                            } @else {
                              <span class="font-mono-tabular font-semibold text-amber-700">
                                UPLOAD REQUIRED
                              </span>
                            }
                          </div>
                          <h4 class="font-display text-base font-bold text-[#0D0F17]">{{ doc.label }}</h4>
                          <p class="text-xs text-[#5A6275]">Issuing Authority: {{ doc.authority }}</p>
                          <p class="text-xs font-mono-tabular text-[#0D0F17] bg-white px-3 py-2 rounded-lg border border-[#DCE2EE]">
                            {{ doc.extractedSummary }}
                          </p>
                        </div>

                        <div class="flex items-center justify-between pt-2">
                          <span class="text-[11px] font-mono-tabular text-[#5A6275]">
                            Last Synced: {{ doc.updatedAt }}
                          </span>
                          <button
                            type="button"
                            (click)="store.simulateOcrUpload(doc.type)"
                            class="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#2B44FF] text-white hover:bg-[#1E36E0] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <mat-icon class="!text-sm !w-4 !h-4 leading-none">document_scanner</mat-icon>
                            <span>{{ doc.verifiedOcr ? 'Re-Scan OCR' : '1-Click OCR Upload & Verify' }}</span>
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- SUB-TAB D: KANBAN APPLICATION TRACKER & DEFECT RESOLUTION -->
              @if (store.studentSubTab() === 'KANBAN') {
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="font-display text-lg font-bold text-[#0D0F17]">
                        Live Scholarship Application Kanban Pipeline
                      </h3>
                      <p class="text-xs text-[#5A6275]">
                        Real-time synchronization with the Institute Nodal Officer (INO) Desk and Ministry PFMS Portal.
                      </p>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                    @for (col of store.kanbanColumns(); track col.status) {
                      <div class="bg-white rounded-2xl border border-[#DCE2EE] p-4 flex flex-col gap-3 min-h-[340px]">
                        <div class="flex items-center justify-between pb-2.5 border-b border-[#DCE2EE]">
                          <span class="text-xs font-bold text-[#0D0F17]">{{ col.label }}</span>
                          <span class="font-mono-tabular text-xs font-semibold text-[#2B44FF]">
                            {{ col.items.length }}
                          </span>
                        </div>

                        <div class="space-y-3 flex-1">
                          @for (app of col.items; track app.id) {
                            <div
                              class="p-3.5 rounded-xl bg-[#F4F6FA] border border-[#DCE2EE] space-y-2.5"
                              [class.border-amber-400]="app.status === 'Defective'"
                            >
                              <div class="flex items-center justify-between text-[11px] font-mono-tabular text-[#5A6275]">
                                <span class="font-semibold text-[#0D0F17]">{{ app.id }}</span>
                                <span>{{ formatInr(app.annualAward) }}</span>
                              </div>

                              <div class="text-xs font-bold text-[#0D0F17] leading-snug">
                                {{ app.schemeTitle }}
                              </div>

                              <div class="text-[11px] text-[#5A6275] leading-relaxed">
                                {{ app.inoRemark }}
                              </div>

                              @if (app.pfmsTransactionId) {
                                <div class="text-[11px] font-mono-tabular font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                                  UTR: {{ app.pfmsTransactionId }}
                                </div>
                              }

                              @if (app.status === 'Defective') {
                                <div class="pt-2 border-t border-[#DCE2EE] space-y-2">
                                  <div class="text-[11px] font-semibold text-amber-800">
                                    INO Defect Flag: {{ app.defectReason || app.inoRemark }}
                                  </div>
                                  <button
                                    type="button"
                                    (click)="resolveDefectInKanban(app.id)"
                                    class="w-full py-2 px-3 text-xs font-semibold text-white bg-[#2B44FF] hover:bg-[#1E36E0] rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <mat-icon class="!text-sm !w-4 !h-4 leading-none">build_circle</mat-icon>
                                    <span>Resolve &amp; Resubmit</span>
                                  </button>
                                </div>
                              }

                              <div class="pt-1 flex justify-end">
                                <button
                                  type="button"
                                  (click)="selectedSlipApp.set(app)"
                                  class="text-[11px] font-semibold text-[#2B44FF] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <mat-icon class="!text-xs !w-3.5 !h-3.5 leading-none">receipt_long</mat-icon>
                                  <span>View Slip</span>
                                </button>
                              </div>
                            </div>
                          } @empty {
                            <div class="h-32 flex items-center justify-center text-center text-xs text-[#5A6275]">
                              No applications in {{ col.status }}
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- SUB-TAB E: GLOBAL & EXTERNAL SCHOLARSHIP LINKS (PASTE DIRECT PORTAL URL) -->
              @if (store.studentSubTab() === 'EXTERNAL_LINKS') {
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div class="lg:col-span-5 bg-white rounded-2xl border border-[#DCE2EE] p-6 space-y-4">
                    <div class="border-b border-[#DCE2EE] pb-3.5">
                      <h3 class="font-display text-lg font-bold text-[#0D0F17]">
                        Paste External / Global Scholarship Link
                      </h3>
                      <p class="text-xs text-[#5A6275]">
                        If an institute, university, or ministry is not registered on GRANTLY or takes separate applications on their own website, index the official link here.
                      </p>
                    </div>

                    <form [formGroup]="drawerExternalForm" (ngSubmit)="submitDrawerExternalLink()" class="space-y-3.5">
                      <div>
                        <label for="drw-ext-title" class="block text-xs font-medium text-[#5A6275] mb-1">
                          Scholarship / Fellowship Title
                        </label>
                        <input
                          id="drw-ext-title"
                          type="text"
                          formControlName="title"
                          placeholder="e.g. Stanford Knight-Hennessy / State Portal"
                          class="w-full px-3.5 py-2 text-sm bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                        />
                      </div>

                      <div>
                        <label for="drw-ext-prov" class="block text-xs font-medium text-[#5A6275] mb-1">
                          University / Ministry / Foundation Name
                        </label>
                        <input
                          id="drw-ext-prov"
                          type="text"
                          formControlName="providerName"
                          placeholder="e.g. Stanford University"
                          class="w-full px-3.5 py-2 text-sm bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                        />
                      </div>

                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label for="drw-ext-scope" class="block text-xs font-medium text-[#5A6275] mb-1">
                            Portal Scope
                          </label>
                          <select
                            id="drw-ext-scope"
                            formControlName="scope"
                            class="w-full px-3 py-2 text-xs bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                          >
                            <option value="Global / International">Global / International</option>
                            <option value="External University / Institute">External University / Institute</option>
                            <option value="Autonomous Ministry Portal">Autonomous Ministry Portal</option>
                          </select>
                        </div>
                        <div>
                          <label for="drw-ext-award" class="block text-xs font-medium text-[#5A6275] mb-1">
                            Grant Value
                          </label>
                          <input
                            id="drw-ext-award"
                            type="text"
                            formControlName="annualAwardText"
                            class="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                          />
                        </div>
                      </div>

                      <div>
                        <label for="drw-ext-url" class="block text-xs font-medium text-[#5A6275] mb-1">
                          Official Application URL (Paste Link)
                        </label>
                        <input
                          id="drw-ext-url"
                          type="text"
                          formControlName="externalUrl"
                          placeholder="https://..."
                          class="w-full px-3.5 py-2 text-sm font-mono-tabular bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                        />
                      </div>

                      <button
                        type="submit"
                        class="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#2B44FF] hover:bg-[#1E36E0] rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <mat-icon class="!text-sm !w-4 !h-4 leading-none">add_link</mat-icon>
                        <span>Add External Scholarship Link</span>
                      </button>
                    </form>
                  </div>

                  <div class="lg:col-span-7 space-y-4">
                    @for (ext of store.externalLinks(); track ext.id) {
                      <div class="bg-white rounded-2xl border border-[#DCE2EE] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div class="space-y-1.5">
                          <div class="flex items-center gap-2 text-xs font-mono-tabular text-[#2B44FF] font-semibold">
                            <span>{{ ext.scope }}</span>
                            <span>·</span>
                            <span>Deadline: {{ ext.deadline }}</span>
                          </div>
                          <h4 class="font-display text-base font-bold text-[#0D0F17]">{{ ext.title }}</h4>
                          <p class="text-xs text-[#5A6275]">{{ ext.providerName }} — {{ ext.eligibilitySummary }}</p>
                          <div class="text-xs font-mono-tabular font-bold text-[#0D0F17]">
                            Award: {{ ext.annualAwardText }}
                          </div>
                        </div>
                        <a
                          [href]="ext.externalUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="px-4 py-2 text-xs font-semibold text-white bg-[#0D0F17] hover:bg-[#2B44FF] rounded-xl flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                        >
                          <mat-icon class="!text-sm !w-4 !h-4 leading-none">open_in_new</mat-icon>
                          <span>Visit Portal</span>
                        </a>
                      </div>
                    }
                  </div>
                </div>
              }
            }

            <!-- ========================================================= -->
            <!-- 2. INSTITUTE NODAL OFFICER (INO) DESK                     -->
            <!-- ========================================================= -->
            @if (portal === 'INSTITUTE') {
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <!-- Left Column: College Application Queue -->
                <div class="lg:col-span-5 bg-white rounded-2xl border border-[#DCE2EE] p-5 space-y-4">
                  <div class="flex items-center justify-between border-b border-[#DCE2EE] pb-3.5">
                    <div>
                      <h3 class="font-display text-base font-bold text-[#0D0F17]">
                        AISHE College Verification Queue
                      </h3>
                      <p class="text-xs text-[#5A6275]">
                        Select an application to inspect OCR certificates and issue L1 verification or defect remarks.
                      </p>
                    </div>
                    <span class="font-mono-tabular text-xs font-semibold text-[#2B44FF] whitespace-nowrap shrink-0">
                      {{ store.applications().length }} Total
                    </span>
                  </div>

                  <div class="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                    @for (app of store.applications(); track app.id) {
                      <button
                        type="button"
                        (click)="selectInoApp(app)"
                        [class]="
                          selectedInoApp()?.id === app.id
                            ? 'w-full text-left p-4 rounded-xl bg-[#F4F6FA] border-2 border-[#2B44FF] space-y-1.5 transition-all cursor-pointer'
                            : 'w-full text-left p-4 rounded-xl bg-white hover:bg-[#F4F6FA] border border-[#DCE2EE] space-y-1.5 transition-all cursor-pointer'
                        "
                      >
                        <div class="flex items-center justify-between text-xs font-mono-tabular">
                          <span class="font-bold text-[#0D0F17]">{{ app.id }} · {{ app.studentName }}</span>
                          <span
                            class="font-semibold"
                            [class.text-[#2B44FF]]="app.status === 'Submitted'"
                            [class.text-amber-700]="app.status === 'Defective'"
                            [class.text-emerald-700]="app.status === 'Institute Verified' || app.status === 'Ministry Approved' || app.status === 'Disbursed'"
                            [class.text-rose-700]="app.status === 'Rejected'"
                          >
                            {{ app.status }}
                          </span>
                        </div>
                        <div class="text-xs font-semibold text-[#0D0F17] line-clamp-1">
                          {{ app.schemeTitle }}
                        </div>
                        <div class="text-[11px] text-[#5A6275] font-mono-tabular">
                          OTR: {{ app.otrId }} · Marks: {{ app.academicPercentage }}% · Income: {{ formatInr(app.familyIncome) }}
                        </div>
                      </button>
                    }
                  </div>
                </div>

                <!-- Right Column: Split-Screen Document & Marksheet Auditor -->
                <div class="lg:col-span-7 bg-white rounded-2xl border border-[#DCE2EE] p-6 space-y-5">
                  @if (selectedInoApp(); as currentApp) {
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE2EE] pb-4">
                      <div>
                        <div class="text-xs font-mono-tabular text-[#2B44FF] font-semibold">
                          L1 SPLIT-SCREEN AUDITOR · {{ currentApp.id }}
                        </div>
                        <h3 class="font-display text-lg font-bold text-[#0D0F17]">
                          {{ currentApp.studentName }} ({{ currentApp.otrId }})
                        </h3>
                      </div>
                      <span class="font-mono-tabular text-xs font-semibold px-3 py-1 rounded-lg bg-[#F4F6FA] border border-[#DCE2EE]">
                        Current State: {{ currentApp.status }}
                      </span>
                    </div>

                    <!-- Candidate Verification Metrics -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F4F6FA] p-4 rounded-xl border border-[#DCE2EE]">
                      <div>
                        <span class="block text-[11px] text-[#5A6275]">AISHE Institute</span>
                        <span class="font-mono-tabular text-xs font-bold text-[#0D0F17]">
                          {{ currentApp.aisheCode }}
                        </span>
                      </div>
                      <div>
                        <span class="block text-[11px] text-[#5A6275]">Academic Score</span>
                        <span class="font-mono-tabular text-xs font-bold text-[#0D0F17]">
                          {{ currentApp.academicPercentage }}%
                        </span>
                      </div>
                      <div>
                        <span class="block text-[11px] text-[#5A6275]">Family Income</span>
                        <span class="font-mono-tabular text-xs font-bold text-[#0D0F17]">
                          {{ formatInr(currentApp.familyIncome) }}
                        </span>
                      </div>
                      <div>
                        <span class="block text-[11px] text-[#5A6275]">Scholarship Claim</span>
                        <span class="font-mono-tabular text-xs font-bold text-[#2B44FF]">
                          {{ formatInr(currentApp.annualAward) }}
                        </span>
                      </div>
                    </div>

                    <!-- Submitted Certificate Dossier Snapshot -->
                    <div class="space-y-2.5">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-[#5A6275]">
                        Attached DigiLocker / e-District Certificates
                      </h4>
                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        @for (docSnap of currentApp.documentsSnapshot; track docSnap.type) {
                          <div class="p-3.5 rounded-xl bg-[#F4F6FA] border border-[#DCE2EE] space-y-1">
                            <div class="flex items-center justify-between text-xs font-mono-tabular">
                              <span class="font-bold text-[#0D0F17]">{{ docSnap.type }}</span>
                              <mat-icon
                                class="!text-sm !w-4 !h-4 leading-none"
                                [class.text-emerald-600]="docSnap.verified"
                                [class.text-amber-600]="!docSnap.verified"
                              >
                                {{ docSnap.verified ? 'verified' : 'warning' }}
                              </mat-icon>
                            </div>
                            <div class="text-[11px] font-mono-tabular text-[#5A6275]">
                              {{ docSnap.certificateNo }}
                            </div>
                          </div>
                        }
                      </div>
                    </div>

                    <!-- INO Officer Audit Remark Input -->
                    <div class="space-y-2">
                      <label for="ino-remark-input" class="block text-xs font-semibold text-[#0D0F17]">
                        Institute Nodal Officer Audit Remark / Defect Note (Synced to Student Kanban)
                      </label>
                      <textarea
                        id="ino-remark-input"
                        rows="2"
                        [value]="inoRemarkDraft()"
                        (input)="inoRemarkDraft.set($any($event.target).value)"
                        placeholder="Enter verification note or specific defect reason (e.g., 'Income certificate serial mismatch with e-District portal')..."
                        class="w-full px-3.5 py-2.5 text-sm bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17] focus:outline-none focus:border-[#2B44FF]"
                      ></textarea>
                    </div>

                    <!-- Working Audit Decision Buttons -->
                    <div class="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="button"
                        (click)="executeInoDecision(currentApp.id, 'VERIFY')"
                        class="px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <mat-icon class="!text-sm !w-4 !h-4 leading-none">task_alt</mat-icon>
                        <span>Verify &amp; Forward</span>
                      </button>

                      <button
                        type="button"
                        (click)="executeInoDecision(currentApp.id, 'DEFECTIVE')"
                        class="px-4 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <mat-icon class="!text-sm !w-4 !h-4 leading-none">report_problem</mat-icon>
                        <span>Mark Defective</span>
                      </button>

                      <button
                        type="button"
                        (click)="executeInoDecision(currentApp.id, 'REJECT')"
                        class="px-4 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <mat-icon class="!text-sm !w-4 !h-4 leading-none">block</mat-icon>
                        <span>Reject</span>
                      </button>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- ========================================================= -->
            <!-- 3. SCHEME & MINISTRY AUTHORITY PORTAL                     -->
            <!-- ========================================================= -->
            @if (portal === 'MINISTRY') {
              <div class="space-y-6">
                <!-- Ministry Telemetry Strip -->
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div class="bg-white p-4 rounded-2xl border border-[#DCE2EE]">
                    <span class="block text-xs text-[#5A6275]">Active Schemes</span>
                    <span class="font-mono-tabular text-2xl font-bold text-[#0D0F17]">
                      {{ store.schemes().length }}
                    </span>
                  </div>
                  <div class="bg-white p-4 rounded-2xl border border-[#DCE2EE]">
                    <span class="block text-xs text-[#5A6275]">L1 Institute Verified</span>
                    <span class="font-mono-tabular text-2xl font-bold text-[#2B44FF]">
                      {{ store.ministryMetrics().verifiedCount }}
                    </span>
                  </div>
                  <div class="bg-white p-4 rounded-2xl border border-[#DCE2EE]">
                    <span class="block text-xs text-[#5A6275]">Merit List Approved</span>
                    <span class="font-mono-tabular text-2xl font-bold text-indigo-600">
                      {{ store.ministryMetrics().approvedCount }}
                    </span>
                  </div>
                  <div class="bg-white p-4 rounded-2xl border border-[#DCE2EE]">
                    <span class="block text-xs text-[#5A6275]">PFMS Disbursed Count</span>
                    <span class="font-mono-tabular text-2xl font-bold text-emerald-600">
                      {{ store.ministryMetrics().disbursedCount }}
                    </span>
                  </div>
                  <div class="bg-white p-4 rounded-2xl border border-[#DCE2EE]">
                    <span class="block text-xs text-[#5A6275]">Total DBT Disbursed</span>
                    <span class="font-mono-tabular text-xl font-bold text-[#0D0F17]">
                      {{ formatInr(store.ministryMetrics().totalDisbursedInr) }}
                    </span>
                  </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <!-- Left Column: Publish New Scholarship Scheme Form -->
                  <div class="lg:col-span-5 bg-white rounded-2xl border border-[#DCE2EE] p-6 space-y-4">
                    <div class="border-b border-[#DCE2EE] pb-3.5">
                      <h3 class="font-display text-lg font-bold text-[#0D0F17]">
                        Gazette &amp; Publish New Scholarship Scheme
                      </h3>
                      <p class="text-xs text-[#5A6275]">
                        Published schemes appear immediately in the Student Portal catalog and Landing Page showcase.
                      </p>
                    </div>

                    <form [formGroup]="newSchemeForm" (ngSubmit)="submitNewScheme()" class="space-y-3.5">
                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label for="sch-code" class="block text-xs font-medium text-[#5A6275] mb-1">
                            Scheme Gazette Code
                          </label>
                          <input
                            id="sch-code"
                            type="text"
                            formControlName="code"
                            placeholder="e.g. DST-INSPIRE-702"
                            class="w-full px-3 py-2 text-sm font-mono-tabular bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                          />
                        </div>
                        <div>
                          <label for="sch-provider" class="block text-xs font-medium text-[#5A6275] mb-1">
                            Provider Type
                          </label>
                          <select
                            id="sch-provider"
                            formControlName="providerType"
                            class="w-full px-3 py-2 text-sm bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                          >
                            <option value="Central Govt">Central Govt</option>
                            <option value="AICTE / UGC">AICTE / UGC</option>
                            <option value="Corporate CSR">Corporate CSR</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label for="sch-title" class="block text-xs font-medium text-[#5A6275] mb-1">
                          Official Scholarship Title
                        </label>
                        <input
                          id="sch-title"
                          type="text"
                          formControlName="title"
                          placeholder="e.g. INSPIRE SHE Higher Education Science Fellowship"
                          class="w-full px-3.5 py-2 text-sm bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                        />
                      </div>

                      <div>
                        <label for="sch-ministry" class="block text-xs font-medium text-[#5A6275] mb-1">
                          Sponsoring Ministry / Department
                        </label>
                        <input
                          id="sch-ministry"
                          type="text"
                          formControlName="ministry"
                          placeholder="e.g. Department of Science & Technology (DST)"
                          class="w-full px-3.5 py-2 text-sm bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                        />
                      </div>

                      <div class="grid grid-cols-3 gap-3">
                        <div>
                          <label for="sch-award" class="block text-xs font-medium text-[#5A6275] mb-1">
                            Annual Award (₹)
                          </label>
                          <input
                            id="sch-award"
                            type="number"
                            formControlName="annualAward"
                            class="w-full px-3 py-2 text-sm font-mono-tabular bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                          />
                        </div>
                        <div>
                          <label for="sch-income" class="block text-xs font-medium text-[#5A6275] mb-1">
                            Income Cap (₹)
                          </label>
                          <input
                            id="sch-income"
                            type="number"
                            formControlName="maxFamilyIncome"
                            class="w-full px-3 py-2 text-sm font-mono-tabular bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                          />
                        </div>
                        <div>
                          <label for="sch-marks" class="block text-xs font-medium text-[#5A6275] mb-1">
                            Min Marks (%)
                          </label>
                          <input
                            id="sch-marks"
                            type="number"
                            formControlName="minPercentage"
                            class="w-full px-3 py-2 text-sm font-mono-tabular bg-[#F4F6FA] border border-[#DCE2EE] rounded-xl text-[#0D0F17]"
                          />
                        </div>
                      </div>

                      @if (schemeFormError()) {
                        <p class="text-xs font-medium text-rose-600">{{ schemeFormError() }}</p>
                      }

                      <button
                        type="submit"
                        class="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#2B44FF] hover:bg-[#1E36E0] rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <mat-icon class="!text-sm !w-4 !h-4 leading-none">publish</mat-icon>
                        <span>Publish Scholarship Scheme to Catalog</span>
                      </button>
                    </form>
                  </div>

                  <!-- Right Column: Merit List Generator & PFMS Direct Bank Disbursal -->
                  <div class="lg:col-span-7 bg-white rounded-2xl border border-[#DCE2EE] p-6 space-y-5">
                    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE2EE] pb-4">
                      <div>
                        <h3 class="font-display text-lg font-bold text-[#0D0F17]">
                          Automated Merit Ranking &amp; PFMS / DBT Batch Disbursal
                        </h3>
                        <p class="text-xs text-[#5A6275]">
                          Rank L1-verified applications by composite academic/financial index and trigger Aadhaar Bridge transfers.
                        </p>
                      </div>

                      <div class="flex items-center gap-2.5">
                        <button
                          type="button"
                          (click)="store.triggerMinistryMeritList()"
                          class="px-3.5 py-2 text-xs font-semibold text-[#0D0F17] bg-[#F4F6FA] hover:bg-[#E2E8F0] border border-[#DCE2EE] rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <mat-icon class="!text-sm !w-4 !h-4 leading-none">leaderboard</mat-icon>
                          <span>Generate Merit List</span>
                        </button>
                        <button
                          type="button"
                          (click)="store.triggerPfmsBatchDisbursal()"
                          class="px-4 py-2 text-xs font-semibold text-white bg-[#2B44FF] hover:bg-[#1E36E0] rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <mat-icon class="!text-sm !w-4 !h-4 leading-none">account_balance_wallet</mat-icon>
                          <span>Disburse Funds via PFMS/DBT</span>
                        </button>
                      </div>
                    </div>

                    <!-- Merit & Disbursal Ledger Table -->
                    <div class="overflow-x-auto">
                      <table class="w-full text-left border-collapse">
                        <thead>
                          <tr class="border-b border-[#DCE2EE] text-[11px] font-semibold uppercase tracking-wider text-[#5A6275]">
                            <th class="py-2.5 pr-3">Rank / ID</th>
                            <th class="py-2.5 px-3">Scholar &amp; OTR</th>
                            <th class="py-2.5 px-3 text-right">Marks / Income</th>
                            <th class="py-2.5 px-3 text-right">Grant</th>
                            <th class="py-2.5 pl-3">Status &amp; PFMS UTR</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-[#DCE2EE] text-xs">
                          @for (app of store.applications(); track app.id) {
                            <tr class="hover:bg-[#F4F6FA]/60">
                              <td class="py-3 pr-3 font-mono-tabular">
                                @if (app.meritRank) {
                                  <span class="font-bold text-[#2B44FF]">#{{ app.meritRank }}</span>
                                  <span class="text-[#5A6275]"> ({{ app.meritScore }} pts)</span>
                                } @else {
                                  <span class="text-[#5A6275]">—</span>
                                }
                                <div class="text-[11px] text-[#0D0F17] font-semibold">{{ app.id }}</div>
                              </td>
                              <td class="py-3 px-3">
                                <div class="font-semibold text-[#0D0F17]">{{ app.studentName }}</div>
                                <div class="text-[11px] font-mono-tabular text-[#5A6275]">{{ app.otrId }}</div>
                              </td>
                              <td class="py-3 px-3 text-right font-mono-tabular">
                                <div class="font-semibold text-[#0D0F17]">{{ app.academicPercentage }}%</div>
                                <div class="text-[11px] text-[#5A6275]">{{ formatInr(app.familyIncome) }}</div>
                              </td>
                              <td class="py-3 px-3 text-right font-mono-tabular font-bold text-[#0D0F17]">
                                {{ formatInr(app.annualAward) }}
                              </td>
                              <td class="py-3 pl-3">
                                <div class="font-semibold text-[#0D0F17]">{{ app.status }}</div>
                                @if (app.pfmsTransactionId) {
                                  <div class="text-[11px] font-mono-tabular text-emerald-700">
                                    {{ app.pfmsTransactionId }}
                                  </div>
                                }
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- MULTI-STEP APPLICATION WIZARD MODAL                       -->
        <!-- ========================================================= -->
        @if (wizardScheme(); as activeScheme) {
          <div
            class="fixed inset-0 z-60 bg-[#0D0F17]/40 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Scholarship Application Wizard"
          >
            <div class="bg-white rounded-2xl border border-[#DCE2EE] max-w-xl w-full p-6 space-y-5 shadow-xl">
              <div class="flex items-center justify-between border-b border-[#DCE2EE] pb-4">
                <div>
                  <span class="font-mono-tabular text-xs font-semibold text-[#2B44FF]">
                    NSP 2.0 APPLICATION WIZARD · {{ activeScheme.code }}
                  </span>
                  <h3 class="font-display text-lg font-bold text-[#0D0F17]">
                    {{ activeScheme.title }}
                  </h3>
                </div>
                <button
                  type="button"
                  (click)="wizardScheme.set(null)"
                  class="text-[#5A6275] hover:text-[#0D0F17] cursor-pointer"
                >
                  <mat-icon>close</mat-icon>
                </button>
              </div>

              <div class="p-4 rounded-xl bg-[#F4F6FA] border border-[#DCE2EE] space-y-2 text-xs">
                <div class="flex justify-between">
                  <span class="text-[#5A6275]">Applicant OTR ID:</span>
                  <span class="font-mono-tabular font-bold text-[#0D0F17]">{{ store.studentProfile().otrId }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-[#5A6275]">Candidate Name &amp; Score:</span>
                  <span class="font-semibold text-[#0D0F17]">
                    {{ store.studentProfile().fullName }} ({{ store.studentProfile().academicPercentage }}%)
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-[#5A6275]">Annual Award Claim:</span>
                  <span class="font-mono-tabular font-bold text-[#2B44FF]">
                    {{ formatInr(activeScheme.annualAward) }} / yr
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-[#5A6275]">Target AISHE Nodal Desk:</span>
                  <span class="font-mono-tabular font-semibold text-[#0D0F17]">
                    {{ store.studentProfile().institutionName }} ({{ store.studentProfile().aisheCode }})
                  </span>
                </div>
              </div>

              <div class="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  (click)="wizardScheme.set(null)"
                  class="px-4 py-2 text-xs font-semibold text-[#5A6275] hover:text-[#0D0F17] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  (click)="confirmApplicationSubmit(activeScheme.id)"
                  class="px-5 py-2.5 text-xs font-semibold text-white bg-[#2B44FF] hover:bg-[#1E36E0] rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="!text-sm !w-4 !h-4 leading-none">verified</mat-icon>
                  <span>e-Sign with Aadhaar OTR &amp; Submit</span>
                </button>
              </div>
            </div>
          </div>
        }

        <!-- ========================================================= -->
        <!-- PRINTABLE ACKNOWLEDGMENT SLIP MODAL                       -->
        <!-- ========================================================= -->
        @if (selectedSlipApp(); as slip) {
          <div
            class="fixed inset-0 z-60 bg-[#0D0F17]/40 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Printable Scholarship Acknowledgment Slip"
          >
            <div class="bg-white rounded-2xl border border-[#DCE2EE] max-w-lg w-full p-6 space-y-5 shadow-xl">
              <div class="flex items-center justify-between border-b border-[#DCE2EE] pb-3">
                <div>
                  <span class="font-mono-tabular text-xs font-bold text-emerald-700">
                    OFFICIAL NSP / GRANTLY e-ACKNOWLEDGMENT SLIP
                  </span>
                  <h3 class="font-display text-base font-bold text-[#0D0F17]">
                    Application Reference: {{ slip.id }}
                  </h3>
                </div>
                <button
                  type="button"
                  (click)="selectedSlipApp.set(null)"
                  class="text-[#5A6275] hover:text-[#0D0F17] cursor-pointer"
                >
                  <mat-icon>close</mat-icon>
                </button>
              </div>

              <div class="p-4 rounded-xl bg-[#F4F6FA] border border-[#DCE2EE] space-y-2.5 text-xs font-mono-tabular">
                <div class="flex justify-between">
                  <span class="text-[#5A6275]">OTR ID:</span>
                  <span class="font-bold text-[#0D0F17]">{{ slip.otrId }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-[#5A6275]">Applicant Name:</span>
                  <span class="font-bold text-[#0D0F17]">{{ slip.studentName }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-[#5A6275]">Scheme:</span>
                  <span class="font-semibold text-[#0D0F17] text-right max-w-xs">{{ slip.schemeTitle }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-[#5A6275]">AISHE Institute:</span>
                  <span class="font-semibold text-[#0D0F17]">{{ slip.institutionName }} ({{ slip.aisheCode }})</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-[#5A6275]">Sanctioned Slab:</span>
                  <span class="font-bold text-[#2B44FF]">{{ formatInr(slip.annualAward) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-[#5A6275]">Current Pipeline Status:</span>
                  <span class="font-bold text-emerald-700">{{ slip.status }}</span>
                </div>
              </div>

              <div class="flex items-center justify-end gap-3">
                <button
                  type="button"
                  (click)="printSlip()"
                  class="px-4 py-2 text-xs font-semibold text-[#0D0F17] bg-[#F4F6FA] hover:bg-[#E2E8F0] border border-[#DCE2EE] rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <mat-icon class="!text-sm !w-4 !h-4 leading-none">print</mat-icon>
                  <span>Print Acknowledgment</span>
                </button>
                <button
                  type="button"
                  (click)="selectedSlipApp.set(null)"
                  class="px-4 py-2 text-xs font-semibold text-white bg-[#2B44FF] rounded-xl cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class WorkspaceDrawer {
  readonly store = inject(GrantlyStore);
  private readonly fb = inject(FormBuilder);

  readonly formatInr = formatInr;
  readonly formatCourseLevel = formatCourseLevel;

  readonly studentTabs: { id: StudentSubTab; label: string; icon: string }[] = [
    { id: 'BROWSER', label: 'Unstop Scheme Browser', icon: 'explore' },
    { id: 'OTR_PROFILE', label: 'OTR Profile & e-KYC', icon: 'badge' },
    { id: 'DOSSIER', label: 'Smart Dossier (OCR Vault)', icon: 'folder_special' },
    { id: 'KANBAN', label: 'Application Kanban Tracker', icon: 'view_kanban' },
    { id: 'EXTERNAL_LINKS', label: 'Global & External Links', icon: 'public' },
  ];

  readonly allCategories: SocialCategory[] = [
    'General-EWS',
    'OBC',
    'SC/ST',
    'Minority',
    'PwD',
    'Single Girl Child',
  ];

  // Unstop Browser Filter Signals
  readonly searchQuery = signal<string>('');
  readonly providerFilter = signal<string>('ALL');
  readonly statusFilter = signal<'ALL' | 'ELIGIBLE' | 'DOC_MISSING' | 'INELIGIBLE'>('ALL');
  readonly expandedExplainId = signal<string | null>('sch-pm-usp');

  // Application Wizard & Printable Slip State
  readonly wizardScheme = signal<ScholarshipScheme | null>(null);
  readonly selectedSlipApp = signal<ScholarshipApplication | null>(null);

  // INO Auditor State
  readonly selectedInoAppId = signal<string>('APP-2026-9014');
  readonly inoRemarkDraft = signal<string>(
    'Income Certificate serial mismatch with Tehsildar digital signature; re-upload verified copy.'
  );

  readonly selectedInoApp = computed(() => {
    const apps = this.store.applications();
    return apps.find((a) => a.id === this.selectedInoAppId()) ?? apps[0] ?? null;
  });

  readonly defectiveCount = computed(
    () => this.store.studentApplications().filter((a) => a.status === 'Defective').length
  );

  readonly filteredBrowserSchemes = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const prov = this.providerFilter();
    const st = this.statusFilter();
    const evalMap = this.store.schemeEvaluations();

    return this.store.schemes().filter((scheme) => {
      const matchesQuery =
        !q ||
        scheme.title.toLowerCase().includes(q) ||
        scheme.ministry.toLowerCase().includes(q) ||
        scheme.code.toLowerCase().includes(q);
      const matchesProvider = prov === 'ALL' || scheme.providerType === prov;
      const evaluation = evalMap.get(scheme.id);
      const matchesStatus = st === 'ALL' || evaluation?.status === st;
      return matchesQuery && matchesProvider && matchesStatus;
    });
  });

  // Ministry New Scheme Form
  readonly schemeFormError = signal<string | null>(null);
  readonly newSchemeForm = this.fb.nonNullable.group({
    code: ['DST-INSPIRE-702', [Validators.required]],
    title: ['INSPIRE SHE Higher Education Science & Research Fellowship', [Validators.required]],
    ministry: ['Department of Science & Technology (DST)', [Validators.required]],
    providerType: ['Central Govt' as 'Central Govt' | 'AICTE / UGC' | 'Corporate CSR'],
    annualAward: [120000, [Validators.required, Validators.min(10000)]],
    maxFamilyIncome: [600000, [Validators.required, Validators.min(100000)]],
    minPercentage: [78, [Validators.required, Validators.min(50), Validators.max(100)]],
  });

  portalCode(portal: PortalMode): string {
    switch (portal) {
      case 'STUDENT':
        return 'Portal 01 · Student OTR & Discovery';
      case 'INSTITUTE':
        return 'Portal 02 · AISHE Nodal Officer Desk';
      case 'MINISTRY':
        return 'Portal 03 · Scheme & PFMS Authority';
      default:
        return '';
    }
  }

  portalTitle(portal: PortalMode): string {
    switch (portal) {
      case 'STUDENT':
        return 'Student OTR, Smart Dossier & Discovery';
      case 'INSTITUTE':
        return 'INO L1 Split-Screen Verification Desk';
      case 'MINISTRY':
        return 'Ministry Scheme Gazette & PFMS Disbursal';
      default:
        return '';
    }
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  onProviderChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.providerFilter.set(val);
  }

  resetBrowserFilters(): void {
    this.searchQuery.set('');
    this.providerFilter.set('ALL');
    this.statusFilter.set('ALL');
  }

  toggleExplain(schemeId: string): void {
    this.expandedExplainId.update((curr) => (curr === schemeId ? null : schemeId));
  }

  readonly drawerExternalForm = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    providerName: ['', [Validators.required]],
    scope: ['Global / International' as 'Global / International' | 'External University / Institute' | 'Autonomous Ministry Portal'],
    annualAwardText: ['Full Tuition + Stipend', [Validators.required]],
    deadline: ['31 Mar 2027', [Validators.required]],
    externalUrl: ['', [Validators.required]],
    eligibilitySummary: ['Separate application on provider website; OTR eligibility pre-checked.', [Validators.required]],
  });

  openApplyWizard(scheme: ScholarshipScheme): void {
    if (!this.store.requireStudentAuthForApply(scheme.id)) {
      return;
    }
    this.wizardScheme.set(scheme);
  }

  submitDrawerExternalLink(): void {
    const raw = this.drawerExternalForm.getRawValue();
    const res = this.store.addExternalScholarship(raw);
    if (res.ok) {
      this.drawerExternalForm.reset({
        title: '',
        providerName: '',
        scope: 'Global / International',
        annualAwardText: 'Full Tuition + Stipend',
        deadline: '31 Mar 2027',
        externalUrl: '',
        eligibilitySummary: 'Separate application on provider website; OTR eligibility pre-checked.',
      });
    }
  }

  confirmApplicationSubmit(schemeId: string): void {
    const created = this.store.submitApplication(schemeId);
    this.wizardScheme.set(null);
    if (created) {
      this.selectedSlipApp.set(created);
      this.store.studentSubTab.set('KANBAN');
    }
  }

  updateProfileField(field: 'fullName' | 'category' | 'courseLevel' | 'state', value: string): void {
    if (!value.trim()) return;
    this.store.updateStudentProfile({ [field]: value } as Record<string, unknown>);
  }

  updateProfileNumber(field: 'academicPercentage' | 'familyIncome', rawValue: string): void {
    const num = Number(rawValue);
    if (Number.isNaN(num) || num <= 0) return;
    this.store.updateStudentProfile({ [field]: num });
  }

  toggleKycField(field: 'aadhaarEkyc' | 'dbtSeeded'): void {
    const current = this.store.studentProfile()[field];
    this.store.updateStudentProfile({ [field]: !current });
  }

  resolveDefectInKanban(appId: string): void {
    this.store.resolveDefectByStudent(
      appId,
      'Uploaded updated Sem-III Bonafide & e-District Income Certificate via DigiLocker OCR'
    );
  }

  selectInoApp(app: ScholarshipApplication): void {
    this.selectedInoAppId.set(app.id);
    this.inoRemarkDraft.set(app.inoRemark);
  }

  executeInoDecision(appId: string, decision: 'VERIFY' | 'DEFECTIVE' | 'REJECT'): void {
    this.store.recordInoAction(appId, decision, this.inoRemarkDraft());
  }

  submitNewScheme(): void {
    if (this.newSchemeForm.invalid) {
      this.schemeFormError.set('Please fill out all required scheme fields with valid values.');
      return;
    }
    const val = this.newSchemeForm.getRawValue();
    if (!val.title.trim() || !val.code.trim() || !val.ministry.trim()) {
      this.schemeFormError.set('Scheme Code, Title, and Ministry cannot be empty.');
      return;
    }
    this.schemeFormError.set(null);
    this.store.publishNewScheme({
      code: val.code,
      title: val.title,
      ministry: val.ministry,
      providerType: val.providerType,
      annualAward: Number(val.annualAward),
      maxFamilyIncome: Number(val.maxFamilyIncome),
      minPercentage: Number(val.minPercentage),
      eligibleCategories: ['General-EWS', 'OBC', 'SC/ST', 'Minority', 'PwD', 'Single Girl Child'],
      deadlineDays: 25,
      totalSeats: 15000,
    });
  }

  printSlip(): void {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  }
}
