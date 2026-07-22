import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import "@mind-matrix/lucid-components";

@Component({
  selector: "app-root",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <lucid-button variant="primary" (click)="onClick($event)">
      Hello from Angular
    </lucid-button>
  `,
})
export class AppComponent {
  onClick(_e: Event) {
    console.log("clicked");
  }
}
