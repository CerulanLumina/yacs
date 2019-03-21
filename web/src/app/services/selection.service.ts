import { Injectable } from '@angular/core';

import 'rxjs/Rx';
import {Subject, Subscription, Subscriber} from 'rxjs/Rx';

import { Section, Listing, Term } from 'yacs-api-client';
import { SidebarService } from './sidebar.service';
import { SelectedTermService } from './selected-term.service';

export class SelectedSections {

  // A mapping of listing ids to an array of section ids that are selected for it
  private selectionMap: Map<string, string[]>;

  public toggleSection(section: Section): boolean {
    if (this.isSectionSelected(section)) {
      return this.removeSection(section);
    } else {
      return this.addSection(section);
    }
  }
  public addSection(section: Section, fireEvent: boolean = true): boolean {
    const id = section.id;
    const listingId = section.listing.id;
    if (this.selectionMap.has(listingId)) {
      const sectionsForListing = this.selectionMap.get(listingId);
      if (sectionsForListing.indexOf(id) !== -1) {
        return false;
      } else {
        sectionsForListing.push(id);
      }
    } else {
      this.selectionMap.set(listingId, [id]);
      return true;
    }
  }
  public removeSection(section: Section, fireEvent: boolean = true): boolean {
    const id = section.id;
    const listingId = section.listing.id;
    if (this.selectionMap.has(listingId)) {
      const sectionsForListing = this.selectionMap.get(listingId);
      const idIndex = sectionsForListing.indexOf(id);
      if (idIndex !== -1) {
        sectionsForListing.splice(idIndex, 1);
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
  public isSectionSelected(section: Section): boolean {
    const id = section.id;
    const listingId = section.listing.id;
    if (this.selectionMap.has(listingId)) {
      const sectionsForListing = this.selectionMap.get(listingId);
      return sectionsForListing.indexOf(id) !== -1;
    }
  }

  // check if listing has any selected sections
  public hasSelectedSection(listing: Listing): boolean {
    return this.selectionMap.has(listing.id);
  }

  // If listing has any section selected, remove all listing's selected sections
  // else add all listing's sections.
  public toggleListing(listing: Listing) {
    if (this.hasSelectedSection(listing)) {
      // remove all sections of listing
      this.removeListing(listing);
    } else {
      listing.sections.forEach((section) => {
        this.addSection(section, false);
      })
    }
    // TODO fire event
  }

  // removes all sections of a listing
  public removeListing(listing: Listing, fireEvent = true) {
    listing.sections.filter(this.isSectionSelected).forEach((section) => {
      this.removeSection(section, false);
    });
    // TODO fire event if fireEvent
  }

  // clear all selections
  public clearSelections() {
    this.selectionMap.clear();
  }
}

@Injectable()
export class SelectionService {

  private clickEvent = new Subject();
  // Term to SelectedSection associations
  private selections: Map<string, Section[]>;
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
    public sidebarService: SidebarService,
    protected selectedTermService: SelectedTermService) {
    this.selectedTermService.subscribeToActiveTerm((term: Term) => {
      this.clear();
    })
  }

  subscribe (next): Subscription {
    return this.clickEvent.subscribe(next);
  }

  next (event) {
    this.clickEvent.next(event);
  }

  private setItem (data1: string, data2) {
    localStorage.setItem(data1, data2);
  }

  private getItem (data:string) {
    return localStorage.getItem(data);
  }

  // calls removeSection or addSection based on isSectionSelected
  public toggleSection (section : Section) {
    if (!this.selectedTermService.isCurrentTermActive) { return; }
    this.isSectionSelected(section) ? this.removeSection(section) : this.addSection(section);
    this.next('event'); //this should be changed
  }

  // adds section, fires event to observer
  public addSection (section: Section) {
    if (!this.selectedTermService.isCurrentTermActive) { return; }
    let store = this.getSelections() || {};
    store[section.listing.id] = store[section.listing.id] || [];
    if (store[section.listing.id].includes(section.id)) return false;
    store[section.listing.id].push(section.id);
    store[section.listing.id].sort();
    this.setItem('selections', JSON.stringify(store));

    this.sidebarService.addListing(section.listing);
    return true;
  }

  // removes selected section, fires event to observer
  public removeSection (section: Section) {
    if (!this.selectedTermService.isCurrentTermActive) { return; }
    let store = this.getSelections() || {};
    if (!store[section.listing.id] || !store[section.listing.id].includes(section.id)) return false;
    store[section.listing.id].splice(store[section.listing.id].indexOf(section.id), 1);
    if (store[section.listing.id].length == 0) {
      delete store[section.listing.id];
    }
    this.setItem('selections', JSON.stringify(store));
    return true;
  }

  // adds or removes all sections of a listing (if any selected section, remove all sections of listing)
  // otherwise, add all sections
  public toggleCourse(course: Listing) {
    if (!this.selectedTermService.isCurrentTermActive) { return; }
    if (this.hasSelectedSection(course)) {
      let store = this.getSelections();
      delete store[course.id];
      this.setItem('selections', JSON.stringify(store));
    } else {
      course.sections.forEach((s) => {
        this.addSection(s);
      });
    }
    this.next('event');
  }

  // removes all sections of a listing
   public removeListing(course: Listing) {
    if (!this.selectedTermService.isCurrentTermActive) { return; }
    if (this.hasSelectedSection(course)) {
      let store = this.getSelections();
      delete store[course.id];
      this.setItem('selections', JSON.stringify(store));
    } 
    this.next('event');
  }


  // gets whether a section is selected
  public isSectionSelected (section: Section) : boolean {
    let store = this.getSelections();
    return store && store[section.listing.id] && store[section.listing.id].includes(section.id);
  }

  // gets whether a course has a section that is selected
  public hasSelectedSection (course: Listing) : boolean {
    let store = this.getSelections();
    return store && store[course.id] && store[course.id].length > 0;
  }

  // gets a json representation
  public getSelections () {
    return JSON.parse(this.getItem('selections')) || {};
  }

  // gets an array of all selected section ids
  public getSelectedSectionIds () {
    const selections = this.getSelections();
    const sectionIds = [];
    Object.keys(selections).forEach((key) => {
      sectionIds.push(...selections[key]);
    });
    return sectionIds;
  }

  // gets an array of all selected listing ids
  public getSelectedCourseIds () {
    return Object.keys(this.getSelections());
  }

  // removes all selections
  public clear () {
    let store = {};
    this.setItem('selections', JSON.stringify(store));
    this.next('event');
  }
}
