const { Plugin } = require('@uppy/core')
const findDOMElement = require('@uppy/utils/lib/findDOMElement')
const toArray = require('@uppy/utils/lib/toArray')
// Rollup uses get-form-data's ES modules build, and rollup-plugin-commonjs automatically resolves `.default`.
// So, if we are being built using rollup, this require() won't have a `.default` property.
const getFormData = require('get-form-data').default || require('get-form-data')

/**
 * Form
 */
module.exports = class Form extends Plugin {
  static VERSION = require('../package.json').version

  constructor (uppy, opts) {
    super(uppy, opts)
    this.type = 'acquirer'
    this.id = this.opts.id || 'Form'
    this.title = 'Form'

    // set default options
    const defaultOptions = {
      target: null,
      resultName: 'uppyResult',
      getMetaFromForm: true,
      addResultToForm: true,
      submitOnSuccess: false,
      triggerUploadOnSubmit: false
    }

    // merge default options with the ones set by user
    this.opts = Object.assign({}, defaultOptions, opts)

    this.handleFormSubmit = this.handleFormSubmit.bind(this)
    this.handleUploadStart = this.handleUploadStart.bind(this)
    this.handleSuccess = this.handleSuccess.bind(this)
    this.addResultToForm = this.addResultToForm.bind(this)
    this.getMetaFromForm = this.getMetaFromForm.bind(this)
  }

  handleUploadStart () {
    if (this.opts.getMetaFromForm) {
      this.getMetaFromForm()
    }
  }

  handleSuccess (result) {
    if (this.opts.addResultToForm) {
      this.addResultToForm(result)
    }

    if (this.opts.submitOnSuccess) {
      this.form.submit()
    }
  }

  handleFormSubmit (ev) {
    if (this.opts.triggerUploadOnSubmit) {
      ev.preventDefault()
      const elements = toArray(ev.target.elements)
      const disabledByUppy = []
      elements.forEach((el) => {
        const isButton = el.tagName === 'BUTTON' || (el.tagName === 'INPUT' && el.type === 'submit')
        if (isButton && !el.disabled) {
          el.disabled = true
          disabledByUppy.push(el)
        }
      })
      this.uppy.upload().then(() => {
        disabledByUppy.forEach((button) => {
          button.disabled = false
        })
      }, (err) => {
        disabledByUppy.forEach((button) => {
          button.disabled = false
        })
        return Promise.reject(err)
      }).catch((err) => {
        this.uppy.log(err.stack || err.message || err)
      })
    }
  }

  addResultToForm (result) {
    this.uppy.log('[Form] Adding result to the original form:')
    this.uppy.log(result)

    let resultInput = this.form.querySelector(`[name="${this.opts.resultName}"]`)
    if (resultInput) {
      resultInput.value = JSON.stringify(result)
      return
    }

    resultInput = document.createElement('input')
    resultInput.name = this.opts.resultName
    resultInput.type = 'hidden'
    resultInput.value = JSON.stringify(result)
    this.form.appendChild(resultInput)
  }

  getMetaFromForm () {
    const formMeta = getFormData(this.form)
    this.uppy.setMeta(formMeta)
  }

  install () {
    this.form = findDOMElement(this.opts.target)
    if (!this.form || !this.form.nodeName === 'FORM') {
      console.error('Form plugin requires a <form> target element passed in options to operate, none was found', 'error')
      return
    }

    this.form.addEventListener('submit', this.handleFormSubmit)
    this.uppy.on('upload', this.handleUploadStart)
    this.uppy.on('complete', this.handleSuccess)
  }

  uninstall () {
    this.form.removeEventListener('submit', this.handleFormSubmit)
    this.uppy.off('upload', this.handleUploadStart)
    this.uppy.off('complete', this.handleSuccess)
  }
}
