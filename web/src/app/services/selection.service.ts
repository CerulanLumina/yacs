import { Injectable } from '@angular/core';

import 'rxjs/Rx';
import {Subject, Subscription, Subscriber} from 'rxjs/Rx';

import { Section, Listing, Term } from 'yacs-api-client';
import { SelectedTermService } from './selected-term.service';

export enum Interest {
  Selected,
  Interested
}

export class InterestedSection {

  constructor(private sectionId: string, private interest: Interest) {}

  public get getSectionId(): string {
    return this.sectionId;
  }

  public get getInterest(): Interest {
    return this.interest;
  }

  public set setInterest(value: Interest) {
    this.interest = value;
  }
}

export class SelectedSections {

  // A mapping of listing ids to an array of section ids that are selected for it
  private selectionMap = new Map<string, InterestedSection[]>();
  private eventCallback: () => void;

  constructor(eventCallback: () => void) {
    this.eventCallback = eventCallback;
  }

  public toggleSection(section: Section): boolean {
    if (this.isSectionSelected(section)) {
      return this.removeSectionSelection(section);
    } else {
      return this.addSection(section, Interest.Selected);
    }
  }
  public addSection(section: Section, interest: Interest, fireEvent: boolean = true): boolean {
    const id = section.id;
    const listingId = section.listing.id;
    if (this.selectionMap.has(listingId)) {
      const sectionsForListing = this.selectionMap.get(listingId);
      if (sectionsForListing.findIndex((interestedSection) => interestedSection.getSectionId === id) !== -1) {
        return false;
      } else {
        sectionsForListing.push(new InterestedSection(id, interest));
      }
    } else {
      this.selectionMap.set(listingId, [new InterestedSection(id, interest)]);
      return true;
    }
    if (fireEvent) {
      this.eventCallback();
    }
  }

  // /**
  //  * Removes a Section entirely (not interested or selected)
  //  * @param section
  //  * @param fireEvent
  //  */
  // public removeSectionEntirely(section: Section, fireEvent: boolean = true): boolean {
  //   const id = section.id;
  //   const listingId = section.listing.id;
  //   if (this.selectionMap.has(listingId)) {
  //     const sectionsForListing = this.selectionMap.get(listingId);
  //     const idIndex = sectionsForListing.findIndex((interestedSection) => interestedSection.getSectionId === id);
  //     if (idIndex !== -1) {
  //       sectionsForListing.splice(idIndex, 1);
  //       if (sectionsForListing.length === 0) {
  //         this.selectionMap.delete(listingId);
  //       }
  //     } else {
  //       return false;
  //     }
  //   } else {
  //     return false;
  //   }
  //   if (fireEvent) {
  //     this.eventCallback();
  //   }
  // }

  /**
   * Removes a Section's selection, dropping it to interested
   * @param section
   * @param fireEvent
   */
  public removeSectionSelection(section: Section, fireEvent: boolean = true): boolean {
    const id = section.id;
    const listingId = section.listing.id;
    if (this.selectionMap.has(listingId)) {
      const sectionsForListing = this.selectionMap.get(listingId);
      const idIndex = sectionsForListing.findIndex((interestedSection) => interestedSection.getSectionId === id);
      if (idIndex !== -1) {
        sectionsForListing[idIndex].setInterest = Interest.Interested;
      } else {
        return false;
      }
    } else {
      return false;
    }
    if (fireEvent) {
      this.eventCallback();
    }
  }

  public getSectionInterest(section: Section): Interest | null {
    const id = section.id;
    const listingId = section.listing.id;
    if (this.selectionMap.has(listingId)) {
      const sectionsForListing = this.selectionMap.get(listingId);
      const index = sectionsForListing.findIndex((interestedSection) => interestedSection.getSectionId === id);
      if (index !== -1) {
        return sectionsForListing[index].getInterest;
      }
      return null;
    }
  }

  public isSectionSelected(section: Section): boolean {
    const sectionInterest = this.getSectionInterest(section);
    if (sectionInterest === null) {
      return false;
    } else {
      return this.getSectionInterest(section) === Interest.Selected;
    }
  }

  public isSectionInterested(section: Section): boolean {
    const sectionInterest = this.getSectionInterest(section);
    if (sectionInterest === null) {
      return false;
    } else {
      return this.getSectionInterest(section) === Interest.Interested;
    }  }

  // check if listing has any interested sections
  public hasInterestedSection(listing: Listing): boolean {
    return this.selectionMap.has(listing.id);
  }

  // check if listing has any selected sections
  public hasSelectedSection(listing: Listing): boolean {
    return this.hasInterestedSection(listing) &&
      this.selectionMap.get(listing.id)
        .map((interestedSection) => interestedSection.getInterest === Interest.Selected)
        .reduce((accum, current) => accum || current, false);
  }

  // If listing has any section selected, remove all listing's selected sections
  // else add all listing's sections.
  public toggleListing(listing: Listing, fireEvent = true) {
    if (this.hasSelectedSection(listing)) {
      // remove all sections of listing
      this.removeListingSelection(listing);
    } else {
      listing.sections.forEach((section) => {
        this.addSection(section, Interest.Selected, false);
      })
    }
    if (fireEvent) {
      this.eventCallback();
    }
  }

  // Drops all sections of a listing to Interested
  public removeListingSelection(listing: Listing, fireEvent = true) {
    listing.sections.filter((sect) => this.isSectionSelected(sect)).forEach((section) => {
      this.removeSectionSelection(section, false);
    });
    if (fireEvent) {
      console.log('here');
      this.eventCallback();
    }
  }

  // Remove a listing entirely
  public removeListingEntirely(listing: Listing, fireEvent = true) {
    if (this.selectionMap.has(listing.id))
    listing.sections.filter((sect) => this.isSectionSelected(sect)).forEach((section) => {
      this.removeSectionSelection(section, false);
    });
    if (fireEvent) {
      console.log('here');
      this.eventCallback();
    }
  }

  // clear all selections
  public clearSelections(fireEvent = true) {
    this.selectionMap.clear();
    if (fireEvent) {
      this.eventCallback();
    }
  }

  // returns an array of all selected sections, paired with its associated course id
  public getSelectedSectionListingPairs(): string[][] {
    const pairs = [];
    this.selectionMap.forEach((interestedSections: InterestedSection[], listing: string) => {
      interestedSections
        .filter((interestedSection) => {
          return interestedSection.getInterest === Interest.Selected;
        })
        .map(selectedSection => selectedSection.getSectionId)
        .forEach((section) => {
          pairs.push([section, listing]);
        });
    });
    return pairs;
  }

  public getSelectedSections(): string[] {
    const ids = [];
    this.selectionMap.forEach((sections: InterestedSection[]) => {
      sections.map(interestedSection => interestedSection.getSectionId);
      ids.push(...sections);
    });
    return ids;
  }

  public getSelectedListings(): string[] {
    return Array.from(this.selectionMap.keys());
  }
}

@Injectable()
export class SelectionService {

  // calls every time a selection is changed with the term id as the argument
  private selectionChanged = new Subject();
  // Term to SelectedSection associations
  private selections = new Map<string, SelectedSections>();

  private dummySelections = new SelectedSections(() => {});
  // toggleSection(Section)
  // addSection(Section)
  // removeSection
  // toggleCourse
  // removeListing
  // clear
  // getSelectedSectionIds
  // getSelections
  // hasSelectedSection
  // isSectionSelected

  constructor (
    protected selectedTermService: SelectedTermService) {
    this.selectedTermService.subscribeToTerm((term) => {
      this.selectionChanged.next(term.id);
    });
  }

  private getSelectedSectionsByTerm(termId?: string): SelectedSections {
    if (termId === undefined) {
      // make sure termId is set (max recursion depth = 1)
      // catch race condition occurs during loading
      // once the term is ready and the actual selections can be determined, this service will ping everyone that
      // the selections have changed via its observable (which will fire when selected-term's fires)
      if (this.selectedTermService.getCurrentTermId === undefined) {
        return this.dummySelections;
      }
      return this.getSelectedSectionsByTerm(this.selectedTermService.getCurrentTermId);
    } else {
      if (this.selections.get(termId) === undefined) {
        this.selections.set(termId, new SelectedSections(() => {
          this.selectionChanged.next(termId);
        }));
      }
      return this.selections.get(termId);
    }
  }

  public subscribeToSelections(subscriber: (_?: string) => void): Subscription {
    return this.selectionChanged.subscribe(subscriber);
  }

  // calls removeSection or addSection based on isSectionSelected
  public toggleSection (section: Section, termId?: string): boolean {
    return this.getSelectedSectionsByTerm(termId).toggleSection(section);
    // if (!this.selectedTermService.isCurrentTermActive) { return; }
    // this.isSectionSelected(section) ? this.removeSection(section) : this.addSection(section);
    // this.next('event'); //this should be changed
  }

  // adds section, fires event to observer
  public addSection (section: Section, termId?: string): boolean {
    return this.getSelectedSectionsByTerm(termId).addSection(section);
    // if (!this.selectedTermService.isCurrentTermActive) { return; }
    // let store = this.getSelections() || {};
    // store[section.listing.id] = store[section.listing.id] || [];
    // if (store[section.listing.id].includes(section.id)) return false;
    // store[section.listing.id].push(section.id);
    // store[section.listing.id].sort();
    // this.setItem('selections', JSON.stringify(store));
    //
    // this.sidebarService.addListing(section.listing);
    // return true;
  }

  // removes selected section, fires event to observer
  public removeSection (section: Section, termId?: string): boolean {
    return this.getSelectedSectionsByTerm(termId).removeSection(section);
    // if (!this.selectedTermService.isCurrentTermActive) { return; }
    // let store = this.getSelections() || {};
    // if (!store[section.listing.id] || !store[section.listing.id].includes(section.id)) return false;
    // store[section.listing.id].splice(store[section.listing.id].indexOf(section.id), 1);
    // if (store[section.listing.id].length == 0) {
    //   delete store[section.listing.id];
    // }
    // this.setItem('selections', JSON.stringify(store));
    // return true;
  }

  // adds or removes all sections of a listing (if any selected section, remove all sections of listing)
  // otherwise, add all sections
  public toggleCourse(listing: Listing, termId?: string) {
    this.getSelectedSectionsByTerm(termId).toggleListing(listing);
    // if (!this.selectedTermService.isCurrentTermActive) { return; }
    // if (this.hasSelectedSection(course)) {
    //   let store = this.getSelections();
    //   delete store[course.id];
    //   this.setItem('selections', JSON.stringify(store));
    // } else {
    //   course.sections.forEach((s) => {
    //     this.addSection(s);
    //   });
    // }
    // this.next('event');
  }

  // removes all sections of a listing
   public removeListing(listing: Listing, termId?: string) {
     this.getSelectedSectionsByTerm(termId).removeListing(listing);
    // if (!this.selectedTermService.isCurrentTermActive) { return; }
    // if (this.hasSelectedSection(course)) {
    //   let store = this.getSelections();
    //   delete store[course.id];
    //   this.setItem('selections', JSON.stringify(store));
    // }
    // this.next('event');
  }


  // gets whether a section is selected
  public isSectionSelected (section: Section, termId?: string): boolean {
    return this.getSelectedSectionsByTerm(termId).isSectionSelected(section);
    // let store = this.getSelections();
    // return store && store[section.listing.id] && store[section.listing.id].includes(section.id);
  }

  // gets whether a course has a section that is selected
  public hasSelectedSection (listing: Listing, termId?: string): boolean {
    return this.getSelectedSectionsByTerm(termId).hasSelectedSection(listing);


    // let store = this.getSelections();
    // return store && store[course.id] && store[course.id].length > 0;
  }

  public getSelectedSectionListingPairs(termId?: string): string[][] {
    return this.getSelectedSectionsByTerm(termId).getSelectedSectionListingPairs();
  }

  // gets an array of all selected section ids
  public getSelectedSectionIds(termId?: string): string[] {
    return this.getSelectedSectionsByTerm(termId).getSelectedSections();
    // const selections = this.getSelections();
    // const sectionIds = [];
    // Object.keys(selections).forEach((key) => {
    //   sectionIds.push(...selections[key]);
    // });
    // return sectionIds;
  }

  public getSelectedListingIds(termId?: string): string[] {
    return this.getSelectedSectionsByTerm(termId).getSelectedListings();
  }

  // removes all selections
  public clear(termId?: string) {
    this.getSelectedSectionsByTerm(termId).clearSelections();
    // let store = {};
    // this.setItem('selections', JSON.stringify(store));
    // this.next('event');
  }
}
