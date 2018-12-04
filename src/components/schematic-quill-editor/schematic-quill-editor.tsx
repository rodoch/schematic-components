import { Component, Element, Event, EventEmitter, Prop, Watch } from '@stencil/core';
import Quill from 'quill';

// Modifying but give credit to: https://raw.githubusercontent.com/KillerCodeMonkey/stencil-quill/master/src/components/quill/quill.tsx
@Component({
  tag: 'schematic-quill-editor',
  styleUrl: 'schematic-quill-editor.scss',
})
/// if scoped: styles must be provided by external stylesheet
/// stencil will add sc-schematic-quill-editor class to all rendered elements as part of scoping
/// the divs etc dynamically generated by quill however will be unaware of this convention
/// thus they will be unstyled as all styles generated in linked scss file will also have the sc classes appended
/// if shadow dom: this solves scoping issue (though Stencil falls back to scoping on unsupportive browsers)
/// however, slotted toolbar elements will not be styled.
/// for now, better to expose quill elements and light dom and avoid conflicts
/// long-term, custom stylesheet may be solution
export class QuillEditor {
    @Event() onInitialised: EventEmitter<any>;
    @Event() onContentChanged: EventEmitter<{
        editor: any,
        content: any,
        text: string,
        html: string,
        delta: any,
        oldDelta: any,
        source: string
    }>;
    @Event() onSelectionChanged: EventEmitter<{
        editor: any,
        range: any,
        oldRange: any,
        source: string
    }>;

    @Element() wrapperElement: HTMLElement;

    @Prop() format: 'object' | 'html' | 'text' | 'json' = 'html';
    @Prop() bounds: HTMLElement | string;
    @Prop() content: string;
    @Prop() formats: string[];
    @Prop() input: string;
    @Prop() modules: { [index: string]: Object };
    @Prop() output: 'html' | 'text' | 'json' = 'html';
    @Prop() placeholder: string = 'Insert text here…';
    @Prop() readOnly: boolean;
    @Prop() scrollingContainer: HTMLElement | string;
    @Prop() strict: boolean = true;
    @Prop() styles: any = {};
    @Prop() theme: string;

    quillEditor: any;
    editorElement: HTMLDivElement;

    private defaultModules = {
        toolbar: [
            [{ header: ['', 1, 2, 3, 4, 5] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['blockquote', 'code-block'],
            [{ script: 'sub' }, { script: 'super' }],
            ['link', 'image'],
            ['clean']
        ]
    }

    selectionChangeEvent: any;
    textChangeEvent: any;

    setEditorContent(value: any) {
        if (this.format === 'object') {
            this.quillEditor.setContents(value, 'silent');
        } else if (this.format === 'html') {
            const contents = this.quillEditor.clipboard.convert(value);
            this.quillEditor.setContents(contents, 'silent');
        } else if (this.format === 'text') {
            this.quillEditor.setText(value);
        } else if (this.format === 'json') {
            try {
                this.quillEditor.setContents(JSON.parse(value), 'silent');
            } catch (e) {
                this.quillEditor.setText(value, 'silent');
            }
        } else {
            this.quillEditor.setText(value, 'silent');
        }
    }

    getEditorContent() {
        const text = this.quillEditor.getText();
        const content = this.quillEditor.getContents();

        let html: string | null = this.editorElement.children[0].innerHTML;

        if (html === '<p><br></p>' || html === '<div><br><div>') {
            html = '';
        }

        if (this.format === 'object') {
            return content;
        } else if (this.format === 'html') {
            return html;
        } else if (this.format === 'text') {
            this.quillEditor.getText();
        } else if (this.format === 'json') {
            try {
                return JSON.stringify(content);
            } catch (e) {
                return text;
            }
        } else {
            return text;
        }
    }

    targetInputElement: HTMLInputElement;

    componentDidLoad() {
        let modules: any = this.modules || this.defaultModules;

        const toolbarElement = this.wrapperElement.querySelector(
            '[slot="quill-toolbar"]'
        );

        if (toolbarElement) {
            modules['toolbar'] = toolbarElement;
        }

        if (this.styles) {
            Object.keys(this.styles).forEach((key: string) => {
                this.editorElement.style[key] = this.styles[key];
            });
        }

        this.quillEditor = new Quill(this.editorElement, {
            modules: modules,
            placeholder: this.placeholder,
            readOnly: this.readOnly || false,
            theme: this.theme || 'snow',
            formats: this.formats,
            bounds: this.bounds ? (this.bounds === 'self' ? this.editorElement : this.bounds) : document.body,
            strict: this.strict,
            scrollingContainer: this.scrollingContainer
        });

        if (this.content && this.content.length > 0) {
            this.setEditorContent(this.content);
            this.quillEditor['history'].clear();
        }
        
        //const imageHandler = () => {
        //    const input = document.createElement('input');
        //    console.log('trigger');
        //    
        //    input.setAttribute('type', 'file');
        //    input.setAttribute('accept', 'image/*');
        //    input.click();
        //    
        //    input.onchange = async () => {
        //        const file = input.files[0];
        //        const formData = new FormData();
        //    
        //        formData.append('image', file);
        //    
        //        // Save current cursor state
        //        const range = this.quillEditor.getSelection(true);
        //    
        //        // Insert temporary loading placeholder image
        //        this.quillEditor.insertEmbed(range.index, 'image', `${ window.location.origin }/images/loaders/placeholder.gif`); 
        //    
        //        // Move cursor to right side of image (easier to continue typing)
        //        this.quillEditor.setSelection(range.index + 1);
        //    
        //        //const res = await apiPostNewsImage(formData); // API post, returns image location as string e.g. 'http://www.example.com/images/foo.png'
        //        console.log('res here')
        //        const res = { 'body': { 'image': 'test'} };

        //        // Remove placeholder image
        //        this.quillEditor.deleteText(range.index, 1);
        //    
        //        // Insert uploaded image
        //        this.quillEditor.insertEmbed(range.index, 'image', res.body.image); 
        //    }
        //}

        //this.quillEditor.getModule('toolbar').addHandler('image', () => {
        //    imageHandler();
        //});

        this.onInitialised.emit(this.quillEditor);

        this.selectionChangeEvent = this.quillEditor.on(
            'selection-change',
            (range: any, oldRange: any, source: string) => {
                this.onSelectionChanged.emit({
                    editor: this.quillEditor,
                    range: range,
                    oldRange: oldRange,
                    source: source
                });
            }
        );

        if (this.input && this.input.length > 0) {
            this.targetInputElement = document.getElementById(this.input) as HTMLInputElement;
        }

        this.textChangeEvent = this.quillEditor.on(
            'text-change',
            (delta: any, oldDelta: any, source: string) => {
                const text = this.quillEditor.getText();
                const content = this.quillEditor.getContents();
                
                let html: string | null = this.editorElement.children[0].innerHTML;

                if (html === '<p><br></p>' || html === '<div><br><div>') {
                    html = null;
                }
                
                if (this.input && this.input.length > 0) {
                    switch (this.output)
                    {
                        case "html":
                            this.targetInputElement.value = html;
                            break;
                        case "text":
                            this.targetInputElement.value = text;
                            break;
                        case "json":
                            this.targetInputElement.value = JSON.stringify(content);
                            break;
                        default:
                            this.targetInputElement.value = html;
                            break;
                    }
                }
            
                this.onContentChanged.emit({
                    editor: this.quillEditor,
                    content,
                    delta,
                    html,
                    oldDelta,
                    source,
                    text
                });
            }
        );
    }

    componentDidUnload() {
        if (this.selectionChangeEvent) {
            this.selectionChangeEvent.removeListener('selection-change');
        }
        if (this.textChangeEvent) {
            this.textChangeEvent.removeListener('text-change');
        }
    }

    @Watch('content')
    updateContent(newValue: any): void {
        const editorContents = this.getEditorContent();

        if (['text', 'html', 'json'].indexOf(this.format) > -1 && newValue === editorContents) {
            return null;
        } else {
            let changed = false;

            try {
                const newContentString = JSON.stringify(newValue);
                changed = JSON.stringify(editorContents) !== newContentString;
            } catch {
                return null;
            }

            if (!changed) {
                return null;
            }
        }

        this.setEditorContent(newValue);
    }

    @Watch('readOnly')
    updateReadOnly(newValue: boolean, oldValue: boolean): void {
        if (!this.quillEditor) {
            return;
        }

        if (newValue !== oldValue) {
            this.quillEditor.enable(!newValue);
        }
    }

    @Watch('placeholder')
    updatePlaceholder(newValue: string, oldValue: string): void {
        if (!this.quillEditor) {
            return;
        }

        if (newValue !== oldValue) {
            this.quillEditor.root.dataset.placeholder = newValue;
        }
    }

    @Watch('styles')
    updateStyle(newValue: object, oldValue: object): void {
        console.log(newValue, oldValue);

        if (!this.quillEditor) {
            return;
        }

        if (oldValue) {
            Object.keys(oldValue).forEach((key: string) => {
                this.editorElement.style[key] = '';
            });
        }

        if (newValue) {
            Object.keys(newValue).forEach((key: string) => {
                this.editorElement.style[key] = newValue[key];
            });
        }
    }

    render() {
        return ([
            <slot name="quill-toolbar" />,
            <div quill-element ref={(el: HTMLDivElement) => this.editorElement = el}></div>
        ]);
    }
}